//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useLayout, type AppSurface } from '@dxos/app-toolkit/ui';
import { linkedSegment } from '@dxos/react-ui-attention';
import { type Database, type Feed, Obj, Query, Relation, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { Filter, useObject, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, IconButton, Panel, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { Menu, MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';
import { HasSubject, Message } from '@dxos/types';

import { type MessageStackActionHandler, MessageStack } from '#components';
import { POPOVER_SAVE_FILTER } from '../../constants';
import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { type Mailbox } from '#types';
import { sortByCreated } from '../../util';

import { getMailboxMessagePath } from '../../paths';

import { NewMailbox } from './NewMailbox';

export type MailboxArticleProps = AppSurface.ObjectArticleProps<
  Mailbox.Mailbox,
  {
    filter?: string;
  }
>;

export const MailboxArticle = ({ subject: mailbox, filter: filterProp, attendableId }: MailboxArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const id = attendableId ?? Obj.getDXN(mailbox).toString();
  const db = Obj.getDatabase(mailbox);

  // TODO(burdon): Review.
  const currentId = useSelected(id, 'single');

  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  useObject(mailbox);
  const feed = mailbox.feed?.target as Feed.Feed | undefined;

  // Menu state.
  const sortDescending = useAtomState(true);
  const menuActions = useMailboxActions({ db, mailbox, sortDescending: sortDescending.atom });

  // Filter and messages.
  const [filter, setFilter] = useState<Filter.Any>();
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  const messages: Message.Message[] = useQuery(
    db,
    feed ? Query.select(filter ?? Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const sortedMessages = useMemo(
    () => [...messages].sort(sortByCreated('created', sortDescending.value)),
    [messages, sortDescending.value],
  );

  // Parse filter.
  const tags = useQuery(db, Filter.type(Tag.Tag));
  const tagMap = useMemo(() => {
    return tags.reduce((acc, tag) => {
      acc[tag.id] = tag;
      return acc;
    }, {} as Tag.Map);
  }, [tags]);
  const parser = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  useEffect(() => setFilter(parser.build(filterText).filter), [filterText, parser]);

  // Build message-to-tags map from HasSubject relations incrementally.
  const messageTagsMap = useMessageTagsMap(db, feed);

  // Merge tags into mailbox labels.
  const mergedLabels = useMemo(() => {
    const labels = { ...mailbox.labels };
    for (const [_messageId, messageTags] of Object.entries(messageTagsMap)) {
      for (const tag of messageTags) {
        labels[tag.id] = tag.label;
      }
    }
    return labels;
  }, [mailbox.labels, messageTagsMap]);

  // Update message properties to include tag IDs in labels array.
  const messagesWithTags = useMemo(() => {
    return sortedMessages.map((message) => {
      const messageTags = messageTagsMap[message.id] ?? [];
      const tagIds = [...new Set(messageTags.map((tag) => tag.id))]; // Deduplicate tag IDs
      const existingLabels = Array.isArray(message.properties?.labels) ? message.properties.labels : [];
      // Deduplicate existing labels and filter out tag IDs that are already present.
      const uniqueExistingLabels = [...new Set(existingLabels)];
      const newTagIds = tagIds.filter((tagId) => !uniqueExistingLabels.includes(tagId));
      const finalLabels = [...uniqueExistingLabels, ...newTagIds];
      return {
        ...message,
        properties: {
          ...message.properties,
          labels: finalLabels,
        },
      };
    });
  }, [sortedMessages, messageTagsMap]);

  // TODO(burdon): Actual test should be if we have synced; not number of messages.
  // Delay showing empty state to prevent flicker as messages are loaded.
  const [isEmpty, setEmpty] = useState<boolean>(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setEmpty(sortedMessages.length === 0);
    }, 1_000);
    return () => clearTimeout(t);
  }, [sortedMessages]);

  const layout = useLayout();
  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = sortedMessages.find((message) => message.id === action.messageId);
          void invokePromise(AttentionOperation.Select, {
            contextId: id,
            selection: { mode: 'single', id: message?.id },
          });

          const companion = linkedSegment('message');
          if (layout.mode === 'simple') {
            // Simple layout: open drawer with message companion.
            void invokePromise(LayoutOperation.UpdateComplementary, {
              subject: companion,
              state: 'expanded',
            });
          } else if (layout.mode === 'multi' && message && db) {
            // Multi deck: open the message plank beside this mailbox (pivot).
            void invokePromise(LayoutOperation.Open, {
              subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)],
              pivotId: id,
              navigation: 'immediate',
            });
          } else if (message) {
            // Solo deck: show message in the companion panel.
            void invokePromise(DeckOperation.ChangeCompanion, {
              companion,
            });
          }
          break;
        }

        case 'select-tag': {
          setFilterText((prevFilterText) => {
            // Check if tag already exists.
            const tags = prevFilterText.split(/\s+/).filter(Boolean);
            if (tags.at(-1)?.toLowerCase() === '#' + action.label.toLowerCase()) {
              return prevFilterText;
            }

            return [prevFilterText.trim(), '#' + action.label].filter(Boolean).join(' ') + ' ';
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
    [db, id, layout.mode, mailbox, sortedMessages, invokePromise],
  );

  const handleClear = useCallback(() => {
    setFilterText(filterProp ?? '');
    setFilter(parser.build(filterProp ?? '').filter);
  }, [filterProp, parser]);

  return (
    <Panel.Root>
      {!isEmpty && (
        <ElevationProvider elevation='positioned'>
          <Menu.Root {...menuActions} attendableId={id}>
            <Panel.Toolbar asChild>
              <Menu.Toolbar>
                <QueryEditor
                  ref={filterEditorRef}
                  classNames='grow min-w-0 ps-1'
                  db={db}
                  tags={tagMap}
                  value={filterText}
                  onChange={setFilterText}
                />
                <IconButton
                  ref={filterSaveButtonRef}
                  disabled={!filter}
                  label={t('mailbox-toolbar-save-button.label')}
                  icon='ph--folder-plus--regular'
                  iconOnly
                  onClick={() => filter && handleAction({ type: 'save', filter: filterText })}
                />
                <IconButton
                  label={t('mailbox-toolbar-clear-button.label')}
                  icon='ph--x--regular'
                  iconOnly
                  onClick={() => handleClear()}
                />
              </Menu.Toolbar>
            </Panel.Toolbar>
          </Menu.Root>
        </ElevationProvider>
      )}
      <Panel.Content asChild>
        {isEmpty ? (
          <NewMailbox mailbox={mailbox} />
        ) : (
          <MessageStack
            id={id}
            messages={messagesWithTags}
            currentId={currentId}
            labels={mergedLabels}
            onAction={handleAction}
          />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * Hook that builds an object mapping message IDs to tags from HasSubject relations.
 */
const useMessageTagsMap = (
  db: Database.Database | undefined,
  feed: Feed.Feed | undefined,
): Record<string, Tag.Tag[]> => {
  const hasSubjectRelations = useQuery(
    db,
    feed ? Query.select(Filter.type(HasSubject.HasSubject)).from(feed) : Query.select(Filter.nothing()),
  );
  const [messageTagsMap, setMessageTagsMap] = useState<Record<string, Tag.Tag[]>>({});

  useEffect(() => {
    const map: Record<string, Tag.Tag[]> = {};
    for (const relation of hasSubjectRelations) {
      try {
        const source = Relation.getSource(relation);
        if (!Obj.instanceOf(Tag.Tag, source)) {
          continue;
        }

        // Try to get message ID from target DXN (queue DXN with objectId).
        const targetDXN = Relation.getTargetDXN(relation);
        const queueDXNInfo = targetDXN.asQueueDXN();
        let messageId: string | undefined;

        if (queueDXNInfo?.objectId) {
          messageId = queueDXNInfo.objectId;
        } else {
          // Fallback: try to resolve target object.
          try {
            const target = Relation.getTarget(relation);
            if (Obj.instanceOf(Message.Message, target)) {
              messageId = target.id;
            }
          } catch {
            // Target not resolved, skip this relation.
          }
        }

        if (messageId) {
          if (!map[messageId]) {
            map[messageId] = [];
          }
          // Prevent duplicates.
          if (!map[messageId].some((tag) => tag.id === source.id)) {
            map[messageId].push(source);
          }
        }
      } catch {
        // Skip relations with unresolved source or target.
      }
    }

    setMessageTagsMap(map);
  }, [hasSubjectRelations]);

  return messageTagsMap;
};

const useMailboxActions = ({
  db,
  mailbox,
  sortDescending,
}: {
  db?: Database.Database;
  mailbox?: Mailbox.Mailbox;
  sortDescending: Atom.Writable<boolean>;
}) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const menu = useMemo(
    () =>
      Atom.make((context) => {
        return MenuBuilder.make()
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
          .build();
      }),
    [sortDescending, invokePromise, db, mailbox],
  );

  return useMenuActions(menu);
};

// TODO(wittjosiah): Factor out.
type AtomState<T> = {
  atom: Atom.Writable<T>;
  value: T;
  set: (value: T | ((value: T) => T)) => void;
};

const useAtomState = <T,>(initialValue: T): AtomState<T> => {
  const atom = useMemo(() => Atom.make(initialValue), [initialValue]);
  const value = useAtomValue(atom);
  const set = useAtomSet(atom);
  return useMemo(() => ({ atom, value, set }), [atom, value, set]);
};
