//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type MessageType } from '@dxos/schema';

import { EmptyMailboxContent } from './EmptyMailboxContent';
import { Mailbox, type MailboxActionHandler } from './Mailbox';
import { InboxCapabilities } from '../../capabilities/capabilities';
import { InboxAction, type MailboxType, MessageState } from '../../types';

export type MailboxContainerProps = {
  mailbox: MailboxType;
};

const byDate =
  (direction = -1) =>
  ({ created: a = '' }: MessageType, { created: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

export const MailboxContainer = ({ mailbox }: MailboxContainerProps) => {
  const id = fullyQualifiedId(mailbox);
  const state = useCapability(InboxCapabilities.MailboxState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const currentMessageId = state[id]?.id;

  const queue = useQueue<MessageType>(mailbox.queue.dxn, { pollInterval: 1_000 });

  const messages = useMemo(
    () =>
      [...(queue?.items ?? [])]
        .filter(
          (message) =>
            message.properties?.state !== MessageState.ARCHIVED && message.properties?.state !== MessageState.DELETED,
        )
        .sort(byDate()),
    [queue?.items],
  );

  const handleAction = useCallback<MailboxActionHandler>(
    ({ action, messageId }) => {
      switch (action) {
        case 'select': {
          log.debug(`[select message] ${messageId}`);
          break;
        }
        case 'current': {
          const message = queue?.items?.find((message) => message.id === messageId);
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
    [id, dispatch],
  );

  return (
    <StackItem.Content classNames='relative'>
      {messages && messages.length > 0 ? (
        <Mailbox
          messages={messages}
          id={id}
          name={mailbox.name}
          onAction={handleAction}
          currentMessageId={currentMessageId}
        />
      ) : (
        <EmptyMailboxContent mailbox={mailbox} />
      )}
    </StackItem.Content>
  );
};
