//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { QueryBuilder } from '@dxos/echo-query';
import { log } from '@dxos/log';
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
  mailbox: Mailbox.Mailbox;
  role?: string;
  attendableId?: string;
  filter?: string;
};

export const MailboxContainer = ({ mailbox, role, attendableId, filter: savedFilter }: MailboxContainerProps) => {
  const { t } = useTranslation(meta.id);
  const id = attendableId ?? fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const filterEditorRef = useRef<EditorController>(null);
  const saveFilterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const [filterText, setFilterText] = useState<string>(savedFilter ?? '');
  const [filter, setFilter] = useState<Filter.Any | null>(null);
  const messages: DataType.Message[] = useQuery(mailbox.queue.target, filter ?? Filter.everything());
  const parser = useMemo(() => new QueryBuilder(), []);
  useEffect(() => {
    setFilter(parser.build(filterText));
  }, [filterText]);

  const actions = useActions(setFilterVisible);

  const handleAction = useCallback<MailboxActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = messages.find((message) => message.id === action.messageId);
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
        case 'select': {
          break;
        }
        case 'select-tag': {
          setFilterText((prevFilterText) => `${prevFilterText} #${action.label}`);
          break;
        }
        case 'save': {
          // TODO(burdon): Implement.
          log.info('save', { action });
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
    [id, mailbox, messages, dispatch],
  );

  const handleCancel = useCallback(() => {
    setFilterVisible(false);
    setFilterText(savedFilter ?? '');
    setFilter(parser.build(savedFilter ?? ''));
  }, []);

  // TODO(burdon): Generalize drawer layout.
  return (
    <StackItem.Content
      classNames={[
        'relative grid',
        filterVisible ? 'grid-rows-[var(--toolbar-size)_min-content_1fr]' : 'grid-rows-[var(--toolbar-size)_1fr]',
      ]}
      layoutManaged
      toolbar
    >
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...actions} attendableId={id}>
          <ToolbarMenu />
        </MenuProvider>
      </ElevationProvider>

      {filterVisible && (
        <div role='none' className='flex is-full items-center p-1 pis-2 border-be border-separator'>
          <QueryEditor
            ref={filterEditorRef}
            autoFocus
            classNames='grow'
            space={getSpace(mailbox)}
            value={filterText}
            onChange={setFilterText}
          />
          <div className='flex gap-1 items-center'>
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

      {messages && messages.length > 0 ? (
        <MailboxComponent
          messages={messages}
          id={id}
          onAction={handleAction}
          currentMessageId={currentMessageId}
          role={role}
        />
      ) : (
        <MailboxEmpty mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};

const useActions = (setFilterVisible: (visible: boolean) => void) => {
  const menu = useMemo(
    () =>
      Rx.make(
        MenuBuilder.make()
          .root({
            label: ['mailbox toolbar title', { ns: meta.id }],
          })
          .action(
            'filter',
            {
              type: 'filter',
              icon: 'ph--magnifying-glass--regular',
              label: ['mailbox toolbar filter by tags', { ns: meta.id }],
            },
            () => {
              setFilterVisible(true);
            },
          )
          // TODO(wittjosiah): Not implemented.
          // .action(
          //   'assistant',
          //   {
          //     label: ['mailbox toolbar run mailbox ai', { ns: meta.id }],
          //     icon: 'ph--sparkle--regular',
          //     type: 'assistant',
          //   },
          //   () => dispatchPromise(createIntent(InboxAction.RunAssistant, { mailbox })),
          // )
          .build(),
      ),
    [],
  );

  return useMenuActions(menu);
};
