//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
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

import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { MailboxEmpty } from './MailboxEmpty';

export type MailboxContainerProps = {
  mailbox: Mailbox.Mailbox;
  role?: string;
};

export const MailboxContainer = ({ mailbox, role }: MailboxContainerProps) => {
  const { t } = useTranslation(meta.id);
  const id = fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const queryEditorRef = useRef<EditorController>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const [queryText, setQueryText] = useState<string>('');
  const [filter, setFilter] = useState<Filter.Any | null>();
  const messages: DataType.Message[] = useQuery(mailbox.queue.target, filter ?? Filter.everything());
  const parser = useMemo(() => new QueryBuilder(), []);
  useEffect(() => {
    setFilter(parser.build(queryText));
  }, [queryText]);

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
  const actions = useMenuActions(menu);

  const handleAction = useCallback<MailboxActionHandler>(
    (action) => {
      console.log(action);
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
          setQueryText((prevQueryText) => `${prevQueryText} #${action.label}`);
          break;
        }
        case 'save': {
          // TODO(burdon): Implement.
          log.info('save', { action });
          break;
        }
      }
    },
    [id, messages, dispatch],
  );

  const handleCancel = useCallback(() => {
    setFilterVisible(false);
    setQueryText('');
    setFilter(null);
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
            ref={queryEditorRef}
            autoFocus
            classNames='grow'
            space={getSpace(mailbox)}
            value={queryText}
            onChange={setQueryText}
          />
          <div className='flex gap-1 items-center'>
            <IconButton
              disabled={!filter}
              label={t('mailbox toolbar save button label')}
              icon='ph--folder-plus--regular'
              iconOnly
              onClick={() => filter && handleAction({ type: 'save', filter })}
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
