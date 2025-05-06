//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type DXN } from '@dxos/keys';
import { useQueue } from '@dxos/react-client/echo';
import { type MessageType } from '@dxos/schema';

import { MailboxModel, type SortDirection } from './mailbox-model';
import { MessageState } from '../../../types';

/**
 * Hook that initializes a MailboxModel and connects it to a message queue.
 * @param queueDxn - The DXN identifier for the queue to subscribe to.
 * @param sortDirection - Initial sort direction (optional).
 * @returns The initialized MailboxModel with data from the queue.
 */
export const useMailboxModel = (queueDxn: DXN, sortDirection: SortDirection = 'desc'): MailboxModel => {
  const model = useMemo(() => new MailboxModel([], sortDirection), [sortDirection]);
  const queue = useQueue<MessageType>(queueDxn);
  const items = useMemo(() => queue?.items ?? [], [queue?.items]);

  const messages = useMemo(
    () =>
      items.filter(
        (message) =>
          message.properties?.state !== MessageState.ARCHIVED && message.properties?.state !== MessageState.DELETED,
      ),
    [items],
  );

  useEffect(() => {
    if (!queue) {
      return;
    }
    model.messages = messages;
  }, [messages, model]);

  return model;
};
