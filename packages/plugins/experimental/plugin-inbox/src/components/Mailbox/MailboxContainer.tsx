//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckAction, surfaceVariant } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import type { MessageType } from '@dxos/schema';

import { Mailbox, type MailboxActionHandler } from './Mailbox';
import { type MailboxType, MessageState } from '../../types';

export type MailboxContainerProps = {
  mailbox: MailboxType;
};

const byDate =
  (direction = -1) =>
  ({ created: a = '' }: MessageType, { created: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

export const MailboxContainer = ({ mailbox }: MailboxContainerProps) => {
  const id = fullyQualifiedId(mailbox);

  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const {
    deck: { activeCompanions },
  } = useCapability(DeckCapabilities.MutableDeckState);
  const currentMessageId = activeCompanions?.[id]?.split('message-')?.[1];

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
          void dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: id,
              companion: surfaceVariant(`message-${messageId}`),
            }),
          );
          break;
        }
      }
    },
    [id, dispatch],
  );

  return (
    <StackItem.Content toolbar={false}>
      <Mailbox
        messages={messages}
        id={id}
        name={mailbox.name}
        onAction={handleAction}
        currentMessageId={currentMessageId}
      />
    </StackItem.Content>
  );
};
