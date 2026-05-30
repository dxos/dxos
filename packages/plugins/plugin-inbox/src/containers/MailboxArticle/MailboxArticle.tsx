//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAtomCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Query, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { invariant } from '@dxos/invariant';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { useAtomState } from '@dxos/react-hooks';
import { ElevationProvider, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelected } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';

import { type MessageStackActionHandler, MessageStack } from '#components';
import { meta } from '#meta';
import { InboxOperation } from '#types';
import { InboxCapabilities, Mailbox } from '#types';

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
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(InboxCapabilities.Settings);
  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  const [mailbox] = useObject(subject);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelected(id, 'single');
  const db = Obj.getDatabase(mailbox);
  const showItem = useShowItem();

  const feed = mailbox.feed?.target;

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);
  const menuActions = useMailboxActions({ db, mailbox: subject, sortDescending: sortDescending.atom });

  // Build message-to-tags map by inverting the unified `mailbox.tags` map.
  // NOT memoized: `Mailbox.applyTag`/`removeTag` mutate nested data under `mailbox.tags`,
  // which a `[mailbox.tags]` dependency wouldn't observe — same ECHO reactivity pitfall
  // documented in `ExtractedTags.tsx`.
  const messageTagsMap = Mailbox.buildMessageTagsIndex(mailbox);
  const tags = useTags(db);

  // Filter.
  const builder = useMemo(() => new QueryBuilder(tags), [tags]);
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
        ? messages.filter((message) => matchesFilter(filter, message, messageTagsMap[message.id] ?? []))
        : messages,
    [messages, filter, messageTagsMap],
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

  const messageIds = useMemo(() => sortedMessages.map((message) => message.id), [sortedMessages]);
  useArticleKeyboardNavigation({ articleId: id, ids: messageIds, currentId, onSelect: handleNavigate });

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        // 'current' fires when a specific message is clicked;
        // 'current-thread' fires when the enclosing thread is clicked (with its latest message).
        case 'current':
        case 'current-thread': {
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

  return (
    <Panel.Root>
      <ElevationProvider elevation='positioned'>
        <Menu.Root {...menuActions} attendableId={id}>
          <Panel.Toolbar asChild>
            {isEmpty ? (
              <Toolbar.Root>
                <InitializeMailboxAction mailbox={subject} />
              </Toolbar.Root>
            ) : (
              <Menu.Toolbar>
                <QueryEditor
                  classNames='grow min-w-0 ps-1'
                  db={db}
                  tags={tags}
                  value={filterText}
                  onChange={setFilterText}
                  ref={filterEditorRef}
                />
                <IconButton
                  disabled={!filter}
                  icon='ph--folder-plus--regular'
                  iconOnly
                  label={t('mailbox-toolbar-save-button.label')}
                  onClick={() => filter && handleAction({ type: 'save', filter: filterText })}
                  ref={filterSaveButtonRef}
                />
                <IconButton
                  icon='ph--x--regular'
                  iconOnly
                  label={t('mailbox-toolbar-clear-button.label')}
                  onClick={handleClear}
                />
              </Menu.Toolbar>
            )}
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
            threads={settings.threads}
            onAction={handleAction}
          />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * Return map of tags;
 */
// TODO(burdon): Factor out.
const useTags = (db: Database.Database | undefined): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      }, {}),
    [tags],
  );
};

type UseMailboxActionsProps = {
  db?: Database.Database;
  mailbox?: Mailbox.Mailbox;
  sortDescending: Atom.Writable<boolean>;
};

const useMailboxActions = ({ db, mailbox, sortDescending }: UseMailboxActionsProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  return useMenuBuilder(
    (context) =>
      MenuBuilder.make()
        .root({
          label: t('mailbox-toolbar.title'),
        })
        .action(
          'sortAscending',
          {
            type: 'sortDescending',
            icon: context.get(sortDescending) ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
            label: t('mailbox-toolbar-sort.menu'),
          },
          () => context.set(sortDescending, !context.get(sortDescending)),
        )
        .action(
          'composeEmail',
          {
            type: 'composeEmail',
            icon: 'ph--paper-plane-right--regular',
            label: t('compose-email.label'),
          },
          () => db && invokePromise(InboxOperation.DraftEmailAndOpen, { db, mailbox }),
        )
        .build(),
    [t, sortDescending, invokePromise, db, mailbox],
  );
};
