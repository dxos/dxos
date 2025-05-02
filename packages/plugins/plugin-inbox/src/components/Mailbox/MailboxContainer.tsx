//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, LayoutAction, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, useQueue, Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { useTranslation, Button } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { AccessTokenType, type MessageType } from '@dxos/schema';

import { Mailbox, type MailboxActionHandler } from './Mailbox';
import { InboxCapabilities } from '../../capabilities/capabilities';
import { INBOX_PLUGIN } from '../../meta';
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

const EmptyMailboxContent = ({ mailbox }: { mailbox: MailboxType }) => {
  const space = getSpace(mailbox);
  const tokens = useQuery(space, Filter.schema(AccessTokenType));
  const { t } = useTranslation(INBOX_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const openSpaceSettings = useCallback(() => {
    if (space) {
      void dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [`integrations-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
          options: {
            workspace: space.id,
          },
        }),
      );
    }
  }, [space, dispatch]);

  // TODO(ZaymonFC): This should be generalised to all tokens that can be used to source messages.
  const gmailToken = tokens.find((t) => t.source.includes('gmail'));
  if (!gmailToken) {
    return (
      <div className='flex flex-col items-center gap-4 p-8'>
        <p className='text-description'>{t('no integrations label')}</p>
        <Button onClick={openSpaceSettings}>{t('manage integrations button label')}</Button>
      </div>
    );
  }

  return <p className='text-description text-center p-8'>{t('empty mailbox message')}</p>;
};
