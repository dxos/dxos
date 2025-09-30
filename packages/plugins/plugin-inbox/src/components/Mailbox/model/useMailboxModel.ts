//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type DXN } from '@dxos/keys';
import { useQueue } from '@dxos/react-client/echo';
import { type DataType } from '@dxos/schema';

import { Mailbox } from '../../../types';

import { MailboxModel, type SortDirection } from './mailbox-model';

/**
 * Hook that initializes a MailboxModel and connects it to a message queue.
 * @param queueDxn - The DXN identifier for the queue to subscribe to.
 * @param sortDirection - Initial sort direction (optional).
 * @returns The initialized MailboxModel with data from the queue.
 */
export const useMailboxModel = (queueDxn: DXN, sortDirection: SortDirection = 'desc'): MailboxModel => {
  const model = useMemo(() => new MailboxModel([], sortDirection), [sortDirection]);
  const queue = useQueue<DataType.Message>(queueDxn);
  const items = useMemo(() => queue?.objects ?? [], [queue?.objects]);
  const messages = useMemo(
    () =>
      items.filter(
        (message) =>
          message.properties?.state !== Mailbox.MessageState.ARCHIVED &&
          message.properties?.state !== Mailbox.MessageState.DELETED,
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
