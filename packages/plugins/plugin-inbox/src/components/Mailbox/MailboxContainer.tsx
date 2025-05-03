//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { EmptyMailboxContent } from './EmptyMailboxContent';
import { Mailbox, type MailboxActionHandler } from './Mailbox';
import { useMailboxModel } from './model';
import { InboxCapabilities } from '../../capabilities/capabilities';
import { InboxAction, type MailboxType } from '../../types';

export type MailboxContainerProps = {
  mailbox: MailboxType;
};

export const MailboxContainer = ({ mailbox }: MailboxContainerProps) => {
  const id = fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  // Use the mailbox model instead of the direct queue
  const model = useMailboxModel(mailbox.queue.dxn);

  const handleAction = useCallback<MailboxActionHandler>(
    ({ action, messageId }) => {
      switch (action) {
        case 'select': {
          log.debug(`[select message] ${messageId}`);
          break;
        }
        case 'current': {
          const message = model.messages.find((message) => message.id === messageId);
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
      }
    },
    [id, dispatch, model.messages],
  );

  return (
    <StackItem.Content classNames='relative'>
      {model.messages && model.messages.length > 0 ? (
        <Mailbox
          messages={model.messages}
          id={id}
          name={mailbox.name}
          onAction={handleAction}
          currentMessageId={currentMessageId}
          onTagSelect={model.selectTag}
        />
      ) : (
        <EmptyMailboxContent mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};
