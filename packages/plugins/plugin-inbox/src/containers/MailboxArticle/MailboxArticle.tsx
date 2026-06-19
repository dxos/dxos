//
// Copyright 2025 DXOS.org
//

import { useAtomSet } from '@effect-atom/atom-react';
import React, { type Ref, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useAtomCapability, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Query, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { invariant } from '@dxos/invariant';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { useAtomState } from '@dxos/react-hooks';
import { ElevationProvider, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';

import { type MessageStackActionHandler, MessageStack } from '#components';
import { meta } from '#meta';
import { InboxOperation } from '#types';
import { InboxCapabilities, Mailbox, Starred } from '#types';

import { POPOVER_SAVE_FILTER } from '../../constants';
import { getMailboxMessagePath } from '../../paths';
import { matchesFilter, sortByCreated } from '../../util';
import { InitializeMailbox, InitializeMailboxAction } from './InitializeMailbox';

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
  }
>;

export const MailboxArticle = ({ subject, filter: filterProp, attendableId }: MailboxArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(InboxCapabilities.Settings);
  const settingsAtom = useCapability(InboxCapabilities.Settings);
  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  const [mailbox] = useObject(subject);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');
  const db = Obj.getDatabase(mailbox);
  const showItem = useShowItem();

  const feed = mailbox.feed?.target;

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);
  const setSettings = useAtomSet(settingsAtom);
  const loadRemoteImages = settings.loadRemoteImages ?? false;

  const handleCompose = useCallback(() => {
    if (db) {
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox: subject });
    }
  }, [db, invokePromise, subject]);

  const menuActions = useMenuBuilder(
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
    [sortDescending, loadRemoteImages, setSettings, handleCompose],
  );

  const tagMap = useTags(db);

  // Build message-to-tags map by inverting the Mailbox tag index.
  // NOT memoized: `Mailbox.applyTag`/`removeTag` mutate nested data under `mailbox.tags`,
  // which a `[mailbox.tags]` dependency wouldn't observe — same ECHO reactivity pitfall
  // documented in `ExtractedTags.tsx`.
  // `messageTagUris` is the raw tag-uri index (used for client-side filtering, same id space as the
  // query); `messageTagsMap` resolves those uris to label/hue chips for rendering.
  const messageTagUris = Mailbox.buildMessageTagsIndex(mailbox);
  const messageTagsMap: Record<string, { id: string; label: string; hue?: string }[]> = {};
  for (const [messageId, uris] of Object.entries(messageTagUris)) {
    messageTagsMap[messageId] = uris.flatMap((uri) => {
      const tag = tagMap[uri];
      return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
    });
  }

  // Starred messages drive the per-tile star toggle. Tagging mutates the child `TagIndex` in place,
  // which `useQuery` doesn't observe, so subscribe to that index directly and re-derive on change.
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [Starred.TAG_STARRED.key]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = mailbox.tags?.target;
  const [, bumpStarred] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => (tagIndex ? Obj.subscribe(tagIndex, bumpStarred) : undefined), [tagIndex]);
  const starredIds = Starred.getStarredIds(mailbox, starredUri);

  // Filter.
  const builder = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  const [filter, setFilter] = useState<Filter.Any>();
  useEffect(() => {
    const { filter } = builder.build(filterText);
    setFilter(filter);
  }, [filterText, builder]);

  // Messages.
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );

  // Feed/queue queries don't yet support text-search and complex filter combinations,
  // so query Messages by type only and apply the parsed filter client-side.
  const filteredMessages = useMemo(
    () =>
      filter
        ? messages.filter((message) => matchesFilter(filter, message, messageTagUris[message.id] ?? []))
        : messages,
    [messages, filter, messageTagUris],
  );

  const sortedMessages = useMemo(
    () => [...filteredMessages].sort(sortByCreated('created', sortDescending.value)),
    [filteredMessages, sortDescending.value],
  );

  // Mark the mailbox as viewed when opened, advancing its `viewedAt` cursor so the navtree new-message
  // badge clears. Uses the live `subject` (not the `mailbox` snapshot) since this mutates, and is keyed on
  // the mailbox id so it runs once per opened mailbox rather than on every update.
  useEffect(() => {
    Mailbox.markViewed(subject);
  }, [subject.id]);

  // TODO(burdon): Actual test should be if we have synced; not number of messages.
  // Delay showing empty state to prevent flicker as messages are loaded.
  const [isEmpty, setEmpty] = useState<boolean>(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setEmpty(messages.length === 0);
    }, 1_000);
    return () => clearTimeout(t);
  }, [messages]);

  const handleClear = useCallback(() => {
    setFilterText(filterProp ?? '');
    setFilter(builder.build(filterProp ?? '').filter);
  }, [filterProp, builder]);

  const handleNavigate = useCallback(
    (messageId: string) => {
      const message = sortedMessages.find((m) => m.id === messageId);
      if (!message || !db) {
        return;
      }
      void showItem({
        contextId: id,
        selectionId: message.id,
        companion: linkedSegment('message'),
        path: getMailboxMessagePath(db.spaceId, mailbox.id, message.id),
      });
    },
    [db, id, mailbox.id, sortedMessages, showItem],
  );

  useArticleKeyboardNavigation({ articleId: id, items: sortedMessages, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        // 'current' fires when a specific message is clicked;
        // 'current-conversation' fires when the enclosing conversation is clicked (with its latest message).
        case 'current':
        case 'current-conversation': {
          const message = sortedMessages.find((message) => message.id === action.messageId);
          invariant(message);
          invariant(db);
          void showItem({
            contextId: id,
            selectionId: message.id,
            companion: linkedSegment('message'),
            path: getMailboxMessagePath(db.spaceId, mailbox.id, message.id),
          });
          break;
        }

        case 'star': {
          const message = sortedMessages.find((message) => message.id === action.messageId);
          if (message && db) {
            void Starred.toggleStarred(subject, message, db);
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
            props: { mailbox: subject, filter: action.filter },
          });
          break;
        }
      }
    },
    [db, id, mailbox.id, subject, sortedMessages, invokePromise, showItem],
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
              <InitializeMailboxAction mailbox={subject} />
            </Menu.Toolbar>
          </Panel.Toolbar>
        </Menu.Root>
      </ElevationProvider>
      <Panel.Content asChild>
        {isEmpty ? (
          <InitializeMailbox mailbox={subject} />
        ) : (
          <MessageStack
            id={id}
            messages={sortedMessages}
            currentId={currentId}
            tags={messageTagsMap}
            starredIds={starredIds}
            conversations={settings.conversations}
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
