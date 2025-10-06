//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { QueryBuilder } from '@dxos/echo-query';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { Filter, fullyQualifiedId, getSpace, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import type { EditorController } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { InboxCapabilities } from '../../capabilities';
import { InboxAction, type Mailbox } from '../../types';

import { EmptyMailboxContent } from './EmptyMailboxContent';
import { type MailboxActionHandler, Mailbox as MailboxComponent } from './Mailbox';
import { useMailboxToolbarActions, useTagFilterVisibility } from './toolbar';

export type MailboxContainerProps = {
  mailbox: Mailbox.Mailbox;
  role?: string;
};

export const MailboxContainer = ({ mailbox, role }: MailboxContainerProps) => {
  const id = fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const queryEditorRef = useRef<EditorController>(null);
  const { tagFilterState, tagFilterVisible, dispatch: filterDispatch } = useTagFilterVisibility();

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (tagFilterState === 'controlled' && queryEditorRef.current) {
      t = setTimeout(() => queryEditorRef.current?.focus());
    }
    return () => clearTimeout(t);
  }, [tagFilterState]);

  const setTagFilterVisible = useCallback(() => {
    filterDispatch('toggle_from_toolbar');
  }, [filterDispatch]);

  const menu = useMailboxToolbarActions(mailbox, tagFilterVisible, setTagFilterVisible);

  const [filter, setFilter] = useState<Filter.Any | null>();
  const [queryText, setQueryText] = useState<string>('');
  const parser = useMemo(() => new QueryBuilder(), []);
  useEffect(() => {
    setFilter(parser.build(queryText));
  }, [queryText]);

  const messages: DataType.Message[] = useQuery(mailbox.queue.target, Filter.tag('eng'));
  // const messages: DataType.Message[] = useQuery(mailbox.queue.target, filter ?? Filter.everything());
  console.log(JSON.stringify(filter));
  // console.log(JSON.stringify(filter), messages.length);
  // console.log(JSON.stringify(messages.slice(0, 3), null, 2));

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
          log.info('select', { messageId: action.messageId });
          break;
        }
        case 'select-tag': {
          log.info('select-tag', { label: action.label });
          filterDispatch('tag_selected_from_message');
          setQueryText((prevQueryText) => `${prevQueryText} #${action.label}`);
          break;
        }
      }
    },
    [id, dispatch, messages, filterDispatch],
  );

  const gridLayout = useMemo(
    () =>
      tagFilterVisible.value
        ? 'grid grid-rows-[var(--toolbar-size)_min-content_1fr]'
        : 'grid grid-rows-[var(--toolbar-size)_1fr]',
    [tagFilterVisible.value],
  );

  return (
    <StackItem.Content classNames={['relative', gridLayout]} layoutManaged toolbar>
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menu} attendableId={id}>
          <ToolbarMenu />
        </MenuProvider>
      </ElevationProvider>

      {tagFilterVisible.value && (
        <div role='none' className='pli-1 pbs-[1px] border-be bs-8 flex items-center border-separator'>
          <QueryEditor space={getSpace(mailbox)} onChange={setQueryText} value={queryText} ref={queryEditorRef} />
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
        <EmptyMailboxContent mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};
