//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useLayout } from '@dxos/app-toolkit/ui';
import { type Database, type Feed, Obj, Query, Relation, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { DXN } from '@dxos/keys';
import { AttentionOperation } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, IconButton, useTranslation } from '@dxos/react-ui';
import { Layout } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { MenuBuilder, createGapSeparator, useMenuActions } from '@dxos/react-ui-menu';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { HasSubject, Message } from '@dxos/types';

import { type MailboxActionHandler, Mailbox as MailboxComponent, MailboxEmpty } from '../../components';
import { POPOVER_SAVE_FILTER } from '../../constants';
import { meta } from '../../meta';
import { InboxOperation, Mailbox } from '../../types';
import { sortByCreated } from '../../util';

export type MailboxArticleProps = SurfaceComponentProps<
  Feed.Feed,
  {
    filter?: string;
    attendableId?: string;
  }
>;

export const MailboxArticle = ({ subject: feed, filter: filterProp, attendableId }: MailboxArticleProps) => {
  const { t } = useTranslation(meta.id);
  const id = attendableId ?? Obj.getDXN(feed).toString();
  const db = Obj.getDatabase(feed);
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();
  const currentMessageId = useSelected(id, 'single');

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);
  const filterVisible = useAtomState(false);
  const menuActions = useMailboxActions({
    db,
    sortDescending: sortDescending.atom,
    filterVisible: filterVisible.atom,
  });

  // Get the feed's database and config.
  const configs = useQuery(db, Filter.type(Mailbox.Config));
  // TODO(wittjosiah): Not possible to filter by references yet.
  const config = useMemo(
    () => configs.find((config) => DXN.equals(config.feed.dxn, Obj.getDXN(feed))),
    [configs, feed],
  );

  // Filter and messages.
  const [filter, setFilter] = useState<Filter.Any>();
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  const messages: Message.Message[] = useQuery(
    db,
    Query.select(filter ?? Filter.type(Message.Message)).from(feed),
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

  // Merge tags into config labels.
  const mergedLabels = useMemo(() => {
    const labels = { ...(config?.labels ?? {}) };
    // Add all tags to the labels object (tag.id -> tag.label).
    for (const [_messageId, messageTags] of Object.entries(messageTagsMap)) {
      for (const tag of messageTags) {
        labels[tag.id] = tag.label;
      }
    }
    return labels;
  }, [config?.labels, messageTagsMap]);

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

  const handleAction = useCallback<MailboxActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = sortedMessages.find((message) => message.id === action.messageId);
          void invokePromise(AttentionOperation.Select, {
            contextId: id,
            selection: { mode: 'single', id: message?.id },
          });

          const companionId = `${id}${ATTENDABLE_PATH_SEPARATOR}message`;
          if (layout.mode === 'simple') {
            // Simple layout: navigate to companion as standalone view.
            void invokePromise(LayoutOperation.Open, {
              subject: [companionId],
            });
          } else {
            // Deck layout: open as companion panel.
            void invokePromise(DeckOperation.ChangeCompanion, {
              primary: id,
              companion: companionId,
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
          filterVisible.set(true);
          filterEditorRef.current?.focus();
          break;
        }

        case 'save': {
          void invokePromise(LayoutOperation.UpdatePopover, {
            subject: POPOVER_SAVE_FILTER,
            state: true,
            variant: 'virtual',
            anchor: filterSaveButtonRef.current,
            props: { feed, config, filter: action.filter },
          });
          break;
        }
      }
    },
    [id, layout.mode, feed, config, sortedMessages, invokePromise],
  );

  const handleCancel = useCallback(() => {
    filterVisible.set(false);
    setFilterText(filterProp ?? '');
    setFilter(parser.build(filterProp ?? '').filter);
  }, [filterVisible, filterProp, parser]);

  return (
    <Layout.Main toolbar>
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menuActions} attendableId={id}>
          <ToolbarMenu />
          {filterVisible.value && (
            <div
              role='none'
              className='grid grid-cols-[1fr_min-content] w-full items-center p-1 gap-1 border-b border-separator'
            >
              <QueryEditor
                ref={filterEditorRef}
                classNames='min-w-0 ps-1'
                autoFocus
                db={db}
                tags={tagMap}
                value={filterText}
                onChange={setFilterText}
              />
              <div role='none' className='flex shrink-0 gap-1 items-center'>
                <IconButton
                  ref={filterSaveButtonRef}
                  disabled={!filter}
                  label={t('mailbox toolbar save button label')}
                  icon='ph--folder-plus--regular'
                  iconOnly
                  onClick={() => filter && handleAction({ type: 'save', filter: filterText })}
                />
                <IconButton
                  label={t('mailbox toolbar clear button label')}
                  icon='ph--x--regular'
                  iconOnly
                  onClick={() => handleCancel()}
                />
              </div>
            </div>
          )}
        </MenuProvider>
      </ElevationProvider>

      {messagesWithTags && messagesWithTags.length > 0 ? (
        <MailboxComponent
          id={id}
          messages={messagesWithTags}
          labels={mergedLabels}
          currentMessageId={currentMessageId}
          onAction={handleAction}
        />
      ) : (
        <MailboxEmpty feed={feed} />
      )}
    </Layout.Main>
  );
};

/**
 * Hook that builds an object mapping message IDs to tags from HasSubject relations.
 */
const useMessageTagsMap = (db: Database.Database | undefined, feed: Feed.Feed): Record<string, Tag.Tag[]> => {
  const hasSubjectRelations = useQuery(db, Query.select(Filter.type(HasSubject.HasSubject)).from(feed));
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
  sortDescending,
  filterVisible,
}: {
  db?: Database.Database;
  sortDescending: Atom.Writable<boolean>;
  filterVisible: Atom.Writable<boolean>;
}) => {
  const { invokePromise } = useOperationInvoker();

  const menu = useMemo(
    () =>
      Atom.make((context) => {
        const base = MenuBuilder.make()
          .root({
            label: ['mailbox toolbar title', { ns: meta.id }],
          })
          .action(
            'sortAscending',
            {
              type: 'sortDescending',
              icon: context.get(sortDescending) ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
              label: ['mailbox toolbar sort', { ns: meta.id }],
            },
            () => context.set(sortDescending, !context.get(sortDescending)),
          )
          .action(
            'filterVisible',
            {
              type: 'filterVisible',
              icon: 'ph--magnifying-glass--regular',
              label: ['mailbox toolbar filter', { ns: meta.id }],
            },
            () => context.set(filterVisible, !context.get(filterVisible)),
          )
          .action(
            'composeEmail',
            {
              type: 'composeEmail',
              icon: 'ph--paper-plane-right--regular',
              label: ['compose email label', { ns: meta.id }],
            },
            () => db && invokePromise(InboxOperation.CreateDraft, { db }),
          )
          .build();

        // Add gap separator before compose email action.
        const gap = createGapSeparator();
        return {
          nodes: [...base.nodes, ...gap.nodes],
          edges: [
            // Keep edges for sort and filter actions.
            ...base.edges.filter((e) => e.target !== 'composeEmail'),
            // Add gap after filter action.
            ...gap.edges,
            // Add compose email after gap.
            { source: 'root', target: 'composeEmail' },
          ],
        };
      }),
    [sortDescending, filterVisible, invokePromise, db],
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
