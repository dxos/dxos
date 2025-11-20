//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { AttentionAction } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, IconButton, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message } from '@dxos/types';

import { meta } from '../../meta';
import { type Mailbox } from '../../types';
import { sortByCreated } from '../../util';

import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { MailboxEmpty } from './MailboxEmpty';
import { POPOVER_SAVE_FILTER } from './PopoverSaveFilter';

export type MailboxArticleProps = SurfaceComponentProps<Mailbox.Mailbox> & { filter?: string; attendableId?: string };

export const MailboxArticle = ({ subject: mailbox, filter: filterParam, attendableId }: MailboxArticleProps) => {
  const { t } = useTranslation(meta.id);
  const id = attendableId ?? Obj.getDXN(mailbox).toString();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
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
  const [filterText, setFilterText] = useState<string>(filterParam ?? '');
  // TODO(burdon): Query not supported on queues.
  //  Query.select(filter ?? Filter.everything()).orderBy(Order.property('createdAt', 'desc')),
  const messages: Message.Message[] = useQuery(
    mailbox.queue.target,
    filter ?? Filter.everything(),
  ) as Message.Message[];
  const sortedMessages = useMemo(
    () => [...messages].sort(sortByCreated('created', sortDescending.value)),
    [messages, sortDescending.value],
  );

  // Parse filter.
  const space = getSpace(mailbox);
  const tags = useQuery(space, Filter.type(Tag.Tag));
  const tagMap = useMemo(() => {
    return tags.reduce((acc, tag) => {
      acc[tag.id] = tag;
      return acc;
    }, {} as Tag.Map);
  }, [tags]);
  const parser = useMemo(() => new QueryBuilder(tagMap), [tagMap]);
  useEffect(() => setFilter(parser.build(filterText).filter), [filterText, parser]);

  const handleAction = useCallback<MailboxActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = sortedMessages.find((message) => message.id === action.messageId);
          void dispatch(
            createIntent(AttentionAction.Select, {
              contextId: id,
              selection: { mode: 'single', id: message?.id },
            }),
          );
          void dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: id,
              companion: `${id}${ATTENDABLE_PATH_SEPARATOR}message`,
            }),
          );
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
          void dispatch(
            createIntent(LayoutAction.UpdatePopover, {
              part: 'popover',
              subject: POPOVER_SAVE_FILTER,
              options: {
                state: true,
                variant: 'virtual',
                anchor: filterSaveButtonRef.current,
                props: { mailbox, filter: action.filter },
              },
            }),
          );
          break;
        }
      }
    },
    [id, mailbox, sortedMessages, dispatch],
  );

  const handleCancel = useCallback(() => {
    filterVisible.set(false);
    setFilterText(filterParam ?? '');
    setFilter(parser.build(filterParam ?? '').filter);
  }, [filterVisible, filterParam, parser]);

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
                db={getSpace(mailbox)?.db}
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

      {sortedMessages && sortedMessages.length > 0 ? (
        <MailboxComponent
          id={id}
          messages={sortedMessages}
          labels={mailbox.labels}
          currentMessageId={currentMessageId}
          onAction={handleAction}
        />
      ) : (
        <MailboxEmpty mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};

const useMailboxActions = ({
  sortDescending,
  filterVisible,
}: {
  sortDescending: Atom.Writable<boolean>;
  filterVisible: Atom.Writable<boolean>;
}) => {
  const menu = useMemo(
    () =>
      Atom.make((context) =>
        MenuBuilder.make()
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
          .build(),
      ),
    [sortDescending, filterVisible],
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
