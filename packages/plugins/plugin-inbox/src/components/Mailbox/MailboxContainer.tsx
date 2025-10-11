//
// Copyright 2025 DXOS.org
//

import { Rx, useRxSet } from '@effect-rx/rx-react';
import { useRxValue } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { QueryBuilder } from '@dxos/echo-query';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { Filter, fullyQualifiedId, getSpace, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, IconButton, useTranslation } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import { type EditorController } from '@dxos/react-ui-editor';
import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { InboxCapabilities } from '../../capabilities';
import { meta } from '../../meta';
import { InboxAction, type Mailbox } from '../../types';
import { POPOVER_SAVE_FILTER } from '../PopoverSaveFilter';

import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { MailboxEmpty } from './MailboxEmpty';

export type MailboxContainerProps = {
  attendableId?: string;
  role?: string;
  mailbox: Mailbox.Mailbox;
  filter?: string;
};

export const MailboxContainer = ({ attendableId, role, mailbox, filter: filterParam }: MailboxContainerProps) => {
  const { t } = useTranslation(meta.id);
  const id = attendableId ?? fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const filterEditorRef = useRef<EditorController>(null);
  const saveFilterButtonRef = useRef<HTMLButtonElement>(null);

  // TODO(wittjosiah): Find a better pattern for declaring this sort of inline state.
  const [descending, isDescending] = useRxState(false);
  const [filterVisible, isFilterVisible, setFilterVisible] = useRxState(false);
  const menuActions = useMailboxActions({ descending, filterVisible });

  // Filter and messages.
  const [filter, setFilter] = useState<Filter.Any | null>(null);
  const [filterText, setFilterText] = useState<string>(filterParam ?? '');
  const messages: DataType.Message[] = useQuery(
    mailbox.queue.target,
    // TODO(burdon): Query not supported on queues?
    // Query.select(filter ?? Filter.everything()).orderBy(Order.property('createdAt', 'desc')),
    filter ?? Filter.everything(),
  );
  const sortedMessages = useMemo(() => (isDescending ? [...messages].reverse() : messages), [messages, isDescending]);

  // Parse filter.
  const parser = useMemo(() => new QueryBuilder(mailbox.tags), []);
  useEffect(() => setFilter(parser.build(filterText)), [filterText]);

  const handleAction = useCallback<MailboxActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = sortedMessages.find((message) => message.id === action.messageId);
          void dispatch(
            createIntent(InboxAction.SelectMessage, {
              mailboxId: id,
              message,
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
          setFilterVisible(true);
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
                anchor: saveFilterButtonRef.current,
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
    setFilterVisible(false);
    setFilterText(filterParam ?? '');
    setFilter(parser.build(filterParam ?? ''));
  }, []);

  return (
    <StackItem.Content
      classNames={[
        'relative grid',
        isFilterVisible ? 'grid-rows-[var(--toolbar-size)_min-content_1fr]' : 'grid-rows-[var(--toolbar-size)_1fr]',
      ]}
      toolbar
      layoutManaged
    >
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menuActions} attendableId={id}>
          <ToolbarMenu />
          {isFilterVisible && (
            <div
              role='none'
              className='grid grid-cols-[1fr_min-content] is-full items-center p-1 gap-1 border-be border-separator'
            >
              <QueryEditor
                ref={filterEditorRef}
                classNames='min-is-0 pis-1'
                autoFocus
                space={getSpace(mailbox)}
                tags={mailbox.tags}
                value={filterText}
                onChange={setFilterText}
              />
              <div role='none' className='flex shrink-0 gap-1 items-center'>
                <IconButton
                  ref={saveFilterButtonRef}
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
          role={role}
          messages={sortedMessages}
          tags={mailbox.tags}
          currentMessageId={currentMessageId}
          onAction={handleAction}
        />
      ) : (
        <MailboxEmpty mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};

// TODO(wittjosiah): Factor out.
const useRxState = <T,>(initialValue: T): [Rx.Writable<T>, T, (value: T | ((value: T) => T)) => void] => {
  const rx = useMemo(() => Rx.make(initialValue), [initialValue]);
  const value = useRxValue(rx);
  const setter = useRxSet(rx);
  return [rx, value, setter];
};

const useMailboxActions = ({
  descending,
  filterVisible,
}: {
  descending: Rx.Writable<boolean>;
  filterVisible: Rx.Writable<boolean>;
}) => {
  const menu = useMemo(
    () =>
      Rx.make((context) =>
        MenuBuilder.make()
          .root({
            label: ['mailbox toolbar title', { ns: meta.id }],
          })
          .action(
            'sort',
            {
              type: 'sort',
              icon: context.get(descending) ? 'ph--sort-descending--regular' : 'ph--sort-ascending--regular',
              label: ['mailbox toolbar sort', { ns: meta.id }],
            },
            () => context.set(descending, !context.get(descending)),
          )
          .action(
            'filter',
            {
              type: 'filter',
              icon: 'ph--magnifying-glass--regular',
              label: ['mailbox toolbar filter', { ns: meta.id }],
            },
            () => context.set(filterVisible, !context.get(filterVisible)),
          )
          .build(),
      ),
    [],
  );

  return useMenuActions(menu);
};
