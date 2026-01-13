//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { type SurfaceComponentProps, useOperationInvoker } from '@dxos/app-framework/react';
import { type Database, Obj, Relation, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { AttentionOperation } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, IconButton, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { MenuBuilder, createGapSeparator, useMenuActions } from '@dxos/react-ui-menu';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { HasSubject, Message } from '@dxos/types';

import { meta } from '../../meta';
import { InboxOperation, type Mailbox } from '../../types';
import { sortByCreated } from '../../util';

import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { MailboxEmpty } from './MailboxEmpty';
import { POPOVER_SAVE_FILTER } from './PopoverSaveFilter';

export type MailboxArticleProps = SurfaceComponentProps<Mailbox.Mailbox> & { filter?: string; attendableId?: string };

export const MailboxArticle = ({ subject: mailbox, filter: filterProp, attendableId }: MailboxArticleProps) => {
  const { t } = useTranslation(meta.id);
  const id = attendableId ?? Obj.getDXN(mailbox).toString();
  const { invokePromise } = useOperationInvoker();
  const currentMessageId = useSelected(id, 'single');

  const filterEditorRef = useRef<EditorController>(null);
  const filterSaveButtonRef = useRef<HTMLButtonElement>(null);

  // Menu state.
  const sortDescending = useAtomState(true);
  const filterVisible = useAtomState(false);
  const menuActions = useMailboxActions({
    sortDescending: sortDescending.atom,
    filterVisible: filterVisible.atom,
  });

  // Filter and messages.
  const [filter, setFilter] = useState<Filter.Any>();
  const [filterText, setFilterText] = useState<string>(filterProp ?? '');
  // TODO(burdon): Query not supported on queues.
  //  Query.select(filter ?? Filter.everything()).orderBy(Order.property('createdAt', 'desc')),
  const messages: Message.Message[] = useQuery(
    mailbox.queue.target,
    filter ?? Filter.type(Message.Message),
  ) as Message.Message[];
  const sortedMessages = useMemo(
    () => [...messages].sort(sortByCreated('created', sortDescending.value)),
    [messages, sortDescending.value],
  );

  // Parse filter.
  const db = Obj.getDatabase(mailbox);
  const tags = useQuery(db, Filter.type(Tag.Tag));
  const tagMap = useMemo(() => {
    return tags.reduce((acc, tag) => {
      acc[tag.id] = tag;
      return acc;
    }, {} as Tag.Map);
  }, [tags]);
  const parser = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  useEffect(() => setFilter(parser.build(filterText).filter), [filterText, parser]);

  // Build message-to-tags map from HasSubject relations incrementally
  const messageTagsMap = useMessageTagsMap(mailbox.queue.target);

  // Merge tags into mailbox labels
  const mergedLabels = useMemo(() => {
    const labels = { ...(mailbox.labels ?? {}) };
    // Add all tags to the labels object (tag.id -> tag.label)
    for (const [_messageId, messageTags] of Object.entries(messageTagsMap)) {
      for (const tag of messageTags) {
        labels[tag.id] = tag.label;
      }
    }
    return labels;
  }, [mailbox.labels, messageTagsMap]);

  // Update message properties to include tag IDs in labels array
  const messagesWithTags = useMemo(() => {
    return sortedMessages.map((message) => {
      const messageTags = messageTagsMap[message.id] ?? [];
      const tagIds = [...new Set(messageTags.map((tag) => tag.id))]; // Deduplicate tag IDs
      const existingLabels = Array.isArray(message.properties?.labels) ? message.properties.labels : [];
      // Deduplicate existing labels and filter out tag IDs that are already present
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
          void invokePromise(DeckOperation.ChangeCompanion, {
            primary: id,
            companion: `${id}${ATTENDABLE_PATH_SEPARATOR}message`,
          });
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
          void invokePromise(Common.LayoutOperation.UpdatePopover, {
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
    [id, mailbox, sortedMessages, invokePromise],
  );

  const handleCancel = useCallback(() => {
    filterVisible.set(false);
    setFilterText(filterProp ?? '');
    setFilter(parser.build(filterProp ?? '').filter);
  }, [filterVisible, filterProp, parser]);

  return (
    <StackItem.Content
      toolbar
      layoutManaged
      classNames={[
        'relative grid',
        filterVisible.value ? 'grid-rows-[var(--toolbar-size)_min-content_1fr]' : 'grid-rows-[var(--toolbar-size)_1fr]',
      ]}
    >
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menuActions} attendableId={id}>
          <ToolbarMenu />
          {filterVisible.value && (
            <div
              role='none'
              className='grid grid-cols-[1fr_min-content] is-full items-center p-1 gap-1 border-be border-separator'
            >
              <QueryEditor
                ref={filterEditorRef}
                classNames='min-is-0 pis-1'
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
        <MailboxEmpty mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};

/**
 * Hook that builds an object mapping message IDs to tags from HasSubject relations.
 */
const useMessageTagsMap = (queue: Database.Queryable | undefined): Record<string, Tag.Tag[]> => {
  const hasSubjectRelations = useQuery(queue, Filter.type(HasSubject.HasSubject));
  const [messageTagsMap, setMessageTagsMap] = useState<Record<string, Tag.Tag[]>>({});

  useEffect(() => {
    const map: Record<string, Tag.Tag[]> = {};

    for (const relation of hasSubjectRelations) {
      try {
        const source = Relation.getSource(relation);
        if (!Obj.instanceOf(Tag.Tag, source)) {
          continue;
        }

        // Try to get message ID from target DXN (queue DXN with objectId)
        const targetDXN = Relation.getTargetDXN(relation);
        const queueDXNInfo = targetDXN.asQueueDXN();
        let messageId: string | undefined;

        if (queueDXNInfo?.objectId) {
          messageId = queueDXNInfo.objectId;
        } else {
          // Fallback: try to resolve target object
          try {
            const target = Relation.getTarget(relation);
            if (Obj.instanceOf(Message.Message, target)) {
              messageId = target.id;
            }
          } catch {
            // Target not resolved, skip this relation
          }
        }

        if (messageId) {
          if (!map[messageId]) {
            map[messageId] = [];
          }
          // Prevent duplicates
          if (!map[messageId].some((tag) => tag.id === source.id)) {
            map[messageId].push(source);
          }
        }
      } catch {
        // Skip relations with unresolved source or target
      }
    }

    setMessageTagsMap(map);
  }, [hasSubjectRelations]);

  return messageTagsMap;
};

const useMailboxActions = ({
  sortDescending,
  filterVisible,
}: {
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
            () => invokePromise(InboxOperation.OpenComposeEmail, undefined),
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
    [sortDescending, filterVisible, invokePromise],
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
