//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { type ReactNode, type Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useAtomCapability,
  useAtomCapabilityState,
  useOperationInvoker,
  useOptionalCapability,
} from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, ProgressMeter, useAppGraph, useProgress, useShowItem } from '@dxos/app-toolkit/ui';
import { Aggregate, type Database, Ref as EchoRef, Filter, Obj, Order, Query, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { usePagination, useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector';
import { useActionRunner } from '@dxos/plugin-graph';
import { AtomState, useAtomState } from '@dxos/react-hooks';
import { ElevationProvider, IconButton, Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { Menu, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import {
  MessageStack,
  type MessageStackActionHandler,
  type MessageStackItem,
  type MessageTagsFamily,
  isMessageGroup,
  useInjectedMailboxActions,
  useMailboxExtractorActions,
  useTargetSync,
} from '#components';
import { meta } from '#meta';
import { InboxOperation } from '#types';
import { InboxCapabilities, Mailbox, Starred } from '#types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import { createTopicsProgressKey } from '../../operations/analyze/analyze-topics';
import { createSyncProgressKey } from '../../operations/google/gmail/sync';
import { InitializeMailbox } from './InitializeMailbox';

/** Messages per page for the lazily-loaded message window. */
const MAILBOX_PAGE_SIZE = 10;

/** Messages shown in a conversation card preview; the full thread size is surfaced via the group `count`. */
const MAILBOX_THREAD_PREVIEW_COUNT = 4;

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
  }
>;

export const MailboxArticle = ({ subject: mailbox, filter: filterProp, attendableId }: MailboxArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(InboxCapabilities.Settings);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(mailbox);
  const showItem = useShowItem();
  const runAction = useActionRunner();
  // Pull "Sync" toolbar action once a connection is bound to this mailbox.
  const { connection, sync, syncing } = useTargetSync(mailbox, {
    success: ['sync-mailbox-success.title', { ns: meta.profile.key }],
    error: ['sync-mailbox-error.title', { ns: meta.profile.key }],
  });

  // Mailbox-scoped operations register a monitor keyed by the mailbox URI (`#sync` for Gmail sync,
  // `#topics` for topic analysis); subscribe to both and show whichever run is active in the statusbar.
  const syncProgress = useProgress(createSyncProgressKey(mailbox));
  const topicsProgress = useProgress(createTopicsProgressKey(mailbox));
  const progress =
    topicsProgress?.status === 'running' || topicsProgress?.status === 'error' ? topicsProgress : syncProgress;
  // Registry (present when plugin-progress is loaded) lets the meter cancel a cancellable run.
  const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);

  const tagMap = useTags(db);
  const feed = useResolveRef(mailbox.feed);
  const tagIndex = useResolveRef(mailbox.tags);
  // Per-message tag chips, as an atom family so each tile subscribes to only its own message's tags.
  const tagsAtom = useMessageTagsAtomFamily(tagIndex, tagMap);

  // Starred messages drive the per-tile star toggle; starred state also lives under the tag index.
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [Starred.TAG_STARRED.key]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const starredAtom = useMemo(() => Starred.atom(tagIndex, starredUri), [tagIndex, starredUri]);

  // Filter.
  const builder = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  const [filter, setFilter] = useState<Filter.Any>();
  useEffect(() => {
    const { filter } = builder.build(filterText);
    setFilter(filter);
  }, [filterText, builder]);

  // Whether messages are grouped into conversations (threads). On by default.
  const conversations = settings.conversations ?? true;
  const direction = sortDescending.value ? 'desc' : 'asc';

  // Order by message `created` (not feed insertion order): a backward/backfill sync appends out of
  // date order. The mailbox reads and sorts/groups the whole feed client-side; `usePagination` and
  // the virtualizer bound only what's rendered, not what's fetched. Bounded-memory windowing isn't
  // possible here — ordering threads by a `max(created)` aggregate needs the full set to rank them.
  const source = feed && Query.select(Filter.type(Message.Message)).from(feed);
  const pagination = usePagination(
    db,
    source
      ? conversations
        ? source
            .orderBy(Order.property('created', 'desc'))
            .aggregate({
              threadId: Aggregate.group('threadId'),
              lastMessageAt: Aggregate.max('created'),
              count: Aggregate.count(),
              items: Aggregate.items({ limit: MAILBOX_THREAD_PREVIEW_COUNT }),
            })
            .orderBy(Order.property('lastMessageAt', direction))
            .limit(MAILBOX_PAGE_SIZE)
        : source.orderBy(Order.property('created', direction)).limit(MAILBOX_PAGE_SIZE)
      : Query.select(Filter.nothing()).limit(MAILBOX_PAGE_SIZE),
  );

  // The aggregate query already orders threads (by latest message) and their members (newest-first),
  // so entries map straight to stack items. Messages without a `threadId` share the aggregate's
  // single `null`-key group; split them back into singleton conversations at that group's position.
  // A thread's preview is capped at `MAILBOX_THREAD_PREVIEW_COUNT`; `count` carries the full size.
  const items = useMemo<MessageStackItem[]>(() => {
    const result: MessageStackItem[] = [];
    for (const entry of pagination.items) {
      if (!isThreadGroup(entry)) {
        result.push(entry);
      } else if (entry.threadId == null) {
        result.push(...entry.items.map((message) => ({ id: message.id, messages: [message] })));
      } else {
        result.push({ id: entry.threadId, messages: entry.items, total: entry.count });
      }
    }
    // Drop messages excluded by the mailbox's filters (e.g. "Ignore sender"); collapse now-empty groups.
    return result.flatMap((item): MessageStackItem[] => {
      if (isMessageGroup(item)) {
        const messages = item.messages.filter((message) => !Mailbox.isFiltered(mailbox, message));
        return messages.length > 0 ? [{ ...item, messages }] : [];
      }
      return Mailbox.isFiltered(mailbox, item) ? [] : [item];
    });
  }, [pagination.items, mailbox, mailbox.messageFilters]);

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(() => items.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])), [items]);

  // TODO(burdon): Actual test should be if we have synced; not number of messages.
  // Show the message list as soon as any messages are present; only fall back to the empty state
  // after a brief delay of genuinely having none (prevents an initial-load flicker). Keyed on the
  // COUNT, not the query-result identity: keying on `messages` (which changes on every update) plus
  // an always-delayed setter meant that during a sync the timeout was cleared before it ever fired,
  // latching the empty state `true` while messages streamed in — the mailbox showed empty for the
  // whole burst and only revealed messages once updates slowed past the 1s window.
  const [isEmpty, setEmpty] = useState<boolean>(false);
  useEffect(() => {
    if (messages.length > 0) {
      setEmpty(false);
      return;
    }
    const t = setTimeout(() => setEmpty(true), 1_000);
    return () => clearTimeout(t);
  }, [messages.length]);

  const handleClear = useCallback(() => {
    setFilterText(filterProp ?? '');
    setFilter(builder.build(filterProp ?? '').filter);
  }, [filterProp, builder]);

  const handleNavigate = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || !db) {
        return;
      }
      // Open the message companion; `MessageArticle` renders the selected message's whole conversation.
      void showItem({ contextId: id, selectionId: message.id, companion: linkedSegment('message') });
    },
    [db, id, messages, showItem],
  );

  useArticleKeyboardNavigation({ articleId: id, items: messages, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        // A message click ('current') and a conversation click ('current-conversation') both open the
        // one unified conversation (thread) view — a single message is just a one-message conversation.
        // Selecting the message opens the message companion, which renders the whole conversation.
        case 'current':
        case 'current-conversation': {
          const message = messages.find((message) => message.id === action.messageId);
          invariant(message);
          invariant(db);
          void showItem({ contextId: id, selectionId: message.id, companion: linkedSegment('message') });
          break;
        }

        case 'star': {
          const message = messages.find((message) => message.id === action.messageId);
          if (message && db) {
            void Starred.toggleStarred(mailbox, message, db);
          }
          break;
        }

        case 'ignore-sender': {
          const message = messages.find((message) => message.id === action.messageId);
          const email = message?.sender?.email;
          if (email && db) {
            Mailbox.ignoreSender(mailbox, email);
            void db.flush();
          }
          break;
        }

        case 'create-topic': {
          const message = messages.find((message) => message.id === action.messageId);
          if (message && db) {
            void invokePromise(
              InboxOperation.CreateTopicFromMessage,
              { mailbox: EchoRef.make(mailbox), message },
              { spaceId: db.spaceId },
            )
              .then((result) => {
                const topicId = result?.data?.topicId;
                if (topicId) {
                  void showItem({ contextId: id, selectionId: topicId, companion: linkedSegment('topic') });
                }
              })
              // Surface the failure instead of silently swallowing it (AI timeout / DB error).
              .catch((err) => log.catch(err));
          }
          break;
        }

        case 'select-tag': {
          setFilterText((prevFilterText) => {
            // Check if tag already exists.
            const tags = prevFilterText.split(/\s+/).filter(Boolean);
            if (tags.at(-1)?.toLowerCase() === '#' + action.label.toLowerCase()) {
              return prevFilterText;
            } else {
              return [prevFilterText.trim(), '#' + action.label].filter(Boolean).join(' ') + ' ';
            }
          });
          filterEditorRef.current?.focus();
          break;
        }

        case 'save': {
          void invokePromise(LayoutOperation.UpdatePopover, {
            subject: POPOVER_SAVE_FILTER,
            state: true,
            variant: 'virtual',
            anchor: filterSaveButtonRef.current,
            props: { mailbox, filter: action.filter },
          });
          break;
        }
      }
    },
    [db, id, mailbox, messages, invokePromise, showItem],
  );

  const handleSaveFilter = useCallback(() => {
    if (filter) {
      handleAction({ type: 'save', filter: filterText });
    }
  }, [filter, filterText, handleAction]);

  // The search box is a toolbar item (custom-rendered) so the connect group can sit to its right.
  // Memoized so its reference (a menu-builder dep) only changes when the filter props do.
  const filterElement = useMemo(
    () => (
      <MailboxFilter
        db={db}
        tags={tagMap}
        value={filterText}
        filter={filter}
        onChange={setFilterText}
        onSave={handleSaveFilter}
        onClear={handleClear}
        editorRef={filterEditorRef}
        saveButtonRef={filterSaveButtonRef}
      />
    ),
    [db, tagMap, filterText, filter, setFilterText, handleSaveFilter, handleClear],
  );

  const menuActions = useMailboxActions(mailbox, {
    sortDescending,
    nodeId: id,
    filterElement,
    connection,
    sync,
    syncing,
  });

  return (
    <Panel.Root data-testid='inbox.mailbox'>
      <ElevationProvider elevation='positioned'>
        <Menu.Root {...menuActions} onAction={runAction} attendableId={id}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar />
          </Panel.Toolbar>
        </Menu.Root>
      </ElevationProvider>
      <Panel.Content asChild>
        {isEmpty ? (
          <InitializeMailbox mailbox={mailbox} />
        ) : (
          <MessageStack
            id={id}
            items={items}
            currentId={currentId}
            tagsAtom={tagsAtom}
            starredAtom={starredAtom}
            pagination={feed ? pagination : undefined}
            enableIgnoreSender
            enableCreateTopic
            onAction={handleAction}
          />
        )}
      </Panel.Content>
      {progress && (progress.status === 'running' || progress.status === 'error') && (
        <Panel.Statusbar asChild>
          <ProgressMeter
            state={progress}
            classNames='border-t border-separator'
            onCancel={progressRegistry ? () => progressRegistry.cancel(progress.name) : undefined}
          />
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};

MailboxArticle.displayName = 'MailboxArticle';

type MailboxFilterProps = {
  db?: Database.Database;
  tags: Tag.Map;
  value: string;
  /** Parsed filter; save is enabled only when the text parses. */
  filter?: Filter.Any;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  editorRef: Ref<EditorController>;
  saveButtonRef: Ref<HTMLButtonElement>;
};

/** Filter row slotted into the mailbox toolbar (query editor + save/clear actions). */
const MailboxFilter = ({
  db,
  tags,
  value,
  filter,
  onChange,
  onSave,
  onClear,
  editorRef,
  saveButtonRef,
}: MailboxFilterProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <>
      <QueryEditor
        classNames='grow min-w-0 ps-1'
        db={db}
        tags={tags}
        value={value}
        onChange={onChange}
        ref={editorRef}
      />
      <IconButton
        disabled={!filter}
        icon='ph--folder-plus--regular'
        iconOnly
        label={t('mailbox-toolbar-save-button.label')}
        onClick={onSave}
        ref={saveButtonRef}
      />
      <IconButton icon='ph--x--regular' iconOnly label={t('mailbox-toolbar-clear-button.label')} onClick={onClear} />
    </>
  );
};

/** One thread's worth of results from the conversation-aggregated message query (see the query above). */
type ThreadGroup = {
  threadId: string | null | undefined;
  lastMessageAt: string | null;
  count: number;
  /** Capped preview (see `MAILBOX_THREAD_PREVIEW_COUNT`); `count` carries the full thread size. */
  items: Message.Message[];
};

// The aggregate query yields flat records, not entities; a real message is an Echo object, a thread
// group is a plain record. `Obj.instanceOf` is the seam between the two.
const isThreadGroup = (entry: Message.Message | ThreadGroup): entry is ThreadGroup =>
  !Obj.instanceOf(Message.Message, entry);

const EMPTY_MESSAGE_TAGS_ATOM = Atom.make((): { id: string; label: string; hue?: string }[] => []);

/**
 * Per-message tag chip atom family over a TagIndex. Each atom yields resolved label/hue chips for one
 * message id and re-renders only when that message's tags (or tag registry labels) change.
 */
const useMessageTagsAtomFamily = (tagIndex: TagIndex.TagIndex | undefined, tagMap: Tag.Map): MessageTagsFamily =>
  useMemo(() => {
    if (!tagIndex) {
      return () => EMPTY_MESSAGE_TAGS_ATOM;
    }
    const urisFamily = TagIndex.atom(tagIndex);
    return Atom.family((messageId: EntityId) =>
      Atom.make((get) => {
        const uris = get(urisFamily(messageId));
        return uris.flatMap((uri) => {
          const tag = tagMap[uri];
          return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
        });
      }),
    );
  }, [tagIndex, tagMap]);

type MailboxActionsOptions = {
  sortDescending: AtomState<boolean>;
  /** The mailbox's graph node id (the article's `attendableId`); contributed actions hang off it. */
  nodeId: string;
  /** Search box, custom-rendered as a toolbar item so the connect group can sit to its right. */
  filterElement: ReactNode;
  /** Bound connection (drives the own pull-"Sync" action). */
  connection?: Connection.Connection;
  sync: () => Promise<void>;
  /** In-flight sync flag, read reactively in the builder. */
  syncing: Atom.Atom<boolean>;
};

const useMailboxActions = (
  mailbox: Mailbox.Mailbox,
  { sortDescending, nodeId, filterElement, connection, sync, syncing }: MailboxActionsOptions,
) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const [settings, setSettings] = useAtomCapabilityState(InboxCapabilities.Settings);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  const handleCompose = useCallback(() => {
    const db = Obj.getDatabase(mailbox);
    invariant(db);
    void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox });
  }, [invokePromise, mailbox]);

  const mailboxExtractorActions = useMailboxExtractorActions(mailbox);
  const mailboxActions = useInjectedMailboxActions(mailbox);
  const extractActions = [...mailboxExtractorActions, ...mailboxActions];

  return useMenuBuilder(
    (get) => {
      // `MenuBuilder` mutates in place, so conditional actions can be added without reassignment.
      const builder = MenuBuilder.make()
        .root({ label: ['mailbox-toolbar.title', { ns: meta.profile.key }] })
        .action(
          'sortAscending',
          {
            type: 'sortDescending',
            icon: sortDescending.value ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
            label: ['mailbox-toolbar-sort.menu', { ns: meta.profile.key }],
          },
          () => sortDescending.set((value) => !value),
        )
        .action(
          'loadImages',
          {
            type: 'loadImages',
            icon: loadRemoteImages ? 'ph--image--regular' : 'ph--image-broken--regular',
            label: ['message-toolbar-load-images.menu', { ns: meta.profile.key }],
            checked: loadRemoteImages,
          },
          () => setSettings((settings) => ({ ...settings, loadRemoteImages: !loadRemoteImages })),
        )
        .subgraph((builder) => {
          if (extractActions.length > 0) {
            return builder.group(
              'extract',
              {
                label: ['mailbox-toolbar-extract.menu', { ns: meta.profile.key }],
                icon: 'ph--magic-wand--regular',
                iconOnly: true,
                variant: 'dropdownMenu',
              },
              (group) => {
                for (const item of extractActions) {
                  group.action(`extract-${item.id}`, { label: item.label }, item.onSelect);
                }
              },
            );
          }
        })
        .action(
          'composeEmail',
          {
            type: 'composeEmail',
            icon: 'ph--pen--regular',
            label: ['compose-email.label', { ns: meta.profile.key }],
          },
          handleCompose,
        );

      // The search box, custom-rendered as a toolbar item so the connect group can sit to its right.
      // Always present (even for an empty mailbox — filtering an empty list is harmless).
      builder.action(
        'filter',
        { variant: 'custom', label: ['mailbox-toolbar.title', { ns: meta.profile.key }], render: () => filterElement },
        () => {},
      );

      // Own action: pull-sync from the provider once connected.
      if (connection) {
        const isSyncing = get(syncing);
        builder.action(
          'sync',
          {
            label: ['sync-mailbox.label', { ns: meta.profile.key }],
            icon: isSyncing ? 'ph--spinner-gap--regular' : 'ph--arrows-clockwise--regular',
            variant: 'primary',
            iconOnly: false,
            disabled: isSyncing,
          },
          () => {
            void sync();
          },
        );
      }

      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction }))
        .build();
    },
    [
      graph,
      nodeId,
      filterElement,
      connection,
      sync,
      syncing,
      sortDescending,
      loadRemoteImages,
      setSettings,
      handleCompose,
      mailboxExtractorActions,
      mailboxActions,
    ],
  );
};

/**
 * Return map of tags;
 */
// TODO(burdon): Factor out.
// Tag registry keyed by the Tag object's URI — the id space used by meta.tags, the Mailbox tag
// index, and the QueryBuilder's `tag:` filter.
const useTags = (db: Database.Database | undefined): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[Obj.getURI(tag).toString()] = tag;
        return acc;
      }, {}),
    [tags],
  );
};
