//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { type Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAtomCapability, useAtomCapabilityState, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { type Database, Filter, GroupKey, Obj, Order, Query, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { usePagination, useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';
import { AtomState, useAtomState } from '@dxos/react-hooks';
import { ElevationProvider, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import {
  MessageStack,
  type MessageStackActionHandler,
  type MessageStackItem,
  type MessageTagsFamily,
  isMessageGroup,
  useMailboxExtractorActions,
} from '#components';
import { meta } from '#meta';
import { InboxOperation } from '#types';
import { InboxCapabilities, Mailbox, Starred } from '#types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import { sortByCreated } from '../../util';
import { InitializeMailbox, InitializeMailboxAction } from './InitializeMailbox';

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
  }
>;

/** Messages per page for the lazily-loaded message window. */
const MAILBOX_PAGE_SIZE = 10;

export const MailboxArticle = ({ subject: mailbox, filter: filterProp, attendableId }: MailboxArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(InboxCapabilities.Settings);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(mailbox);
  const showItem = useShowItem();

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);
  const menuActions = useMailboxActions(mailbox, sortDescending);

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

  // Messages, ordered by message date in the toolbar's sort direction (not feed insertion order): a
  // backward/backfill sync appends out of time order, so the window must be selected by date. When
  // conversation grouping is on, the query groups by `threadId` and `usePagination`'s limit/skip
  // page over whole conversations. This content order currently runs on the client feed path
  // (full-fetch + sort + slice); `usePagination` and the virtualizer bound what's rendered, but the
  // whole feed is fetched to sort it.
  // TODO(wittjosiah): Move this to the host indexer for bounded-memory paging (fetch only the window,
  //   not the whole feed); blocked on indexed ordered range reads being fast enough.
  // `pagination` is passed straight through to `MessageStack` rather than destructured --
  // `usePagination` already returns a stable object, so rebuilding one here would only reintroduce
  // the instability it avoids.
  const orderedQuery =
    feed &&
    Query.select(Filter.type(Message.Message))
      .from(feed)
      .orderBy(Order.property('created', sortDescending.value ? 'desc' : 'asc'));
  const pagination = usePagination(
    db,
    orderedQuery
      ? conversations
        ? orderedQuery.groupBy(GroupKey.property('threadId')).limit(MAILBOX_PAGE_SIZE)
        : orderedQuery.limit(MAILBOX_PAGE_SIZE)
      : Query.select(Filter.nothing()).limit(MAILBOX_PAGE_SIZE),
  );

  // Grouped-query results become conversation entries. Messages without a `threadId` all land in the
  // group-by clause's single `null`-key group; they are split back into singleton conversations and
  // re-interleaved by date (group order from the query follows each group's first occurrence in the
  // date-ordered stream, so the anchor for a conversation is its newest message when descending and
  // its oldest when ascending).
  const items = useMemo<MessageStackItem[]>(() => {
    const result: MessageStackItem[] = [];
    for (const entry of pagination.items) {
      if (!isThreadGroup(entry)) {
        result.push(entry);
        continue;
      }
      const { threadId } = entry.key;
      if (threadId == null) {
        result.push(...entry.values.map((message) => ({ id: message.id, messages: [message] })));
      } else {
        // Conversation tiles show the latest message first regardless of the mailbox sort direction.
        result.push({ id: threadId, messages: [...entry.values].sort(sortByCreated('created', true)) });
      }
    }
    const anchor = (item: MessageStackItem): string =>
      isMessageGroup(item) ? item.messages[sortDescending.value ? 0 : item.messages.length - 1].created : item.created;
    return result.sort((a, b) =>
      sortDescending.value ? anchor(b).localeCompare(anchor(a)) : anchor(a).localeCompare(anchor(b)),
    );
  }, [pagination.items, sortDescending.value]);

  // Flat message list backing keyboard navigation and message-id lookups in action handlers.
  const messages = useMemo(() => items.flatMap((item) => (isMessageGroup(item) ? item.messages : [item])), [items]);

  // Mark the mailbox as viewed when opened, advancing its `viewedAt` cursor so the navtree new-message
  // badge clears. Uses the live `subject` (not the `mailbox` snapshot) since this mutates, and is keyed on
  // the mailbox id so it runs once per opened mailbox rather than on every update.
  useEffect(() => {
    Mailbox.markViewed(mailbox);
  }, [mailbox.id]);

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

  return (
    <Panel.Root>
      <ElevationProvider elevation='positioned'>
        <Menu.Root {...menuActions} attendableId={id}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar>
              {!isEmpty && (
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
              )}
              <Toolbar.Separator />
              <InitializeMailboxAction mailbox={mailbox} />
            </Menu.Toolbar>
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
            onAction={handleAction}
          />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

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

/** One thread's worth of results from the conversation-grouped message query. */
type ThreadGroup = Query.Group<Pick<Message.Message, 'threadId'>, Message.Message>;

const isThreadGroup = (entry: Message.Message | ThreadGroup): entry is ThreadGroup => 'values' in entry;

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

const useMailboxActions = (mailbox: Mailbox.Mailbox, sortDescending: AtomState<boolean>) => {
  const { invokePromise } = useOperationInvoker();
  const [settings, setSettings] = useAtomCapabilityState(InboxCapabilities.Settings);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  const handleCompose = useCallback(() => {
    const db = Obj.getDatabase(mailbox);
    invariant(db);
    void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox });
  }, [invokePromise, mailbox]);

  const mailboxExtractorActions = useMailboxExtractorActions(mailbox);

  return useMenuBuilder(
    () =>
      MenuBuilder.make()
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
          if (mailboxExtractorActions.length > 0) {
            return builder.group(
              'extract',
              {
                label: ['mailbox-toolbar-extract.menu', { ns: meta.profile.key }],
                icon: 'ph--magic-wand--regular',
                iconOnly: true,
                variant: 'dropdownMenu',
              },
              (group) => {
                for (const item of mailboxExtractorActions) {
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
        )
        .build(),
    [sortDescending, loadRemoteImages, setSettings, handleCompose, mailboxExtractorActions],
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
