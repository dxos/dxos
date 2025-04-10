//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId, useQueue } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import type { MessageType } from '@dxos/schema';

import { Mailbox, type MailboxProps } from './Mailbox';
import { type MailboxType } from '../../types';

export type MailboxContainerProps = {
  mailbox: MailboxType;
  options?: MailboxProps['options'];
};

export const MailboxContainer = ({ mailbox, options = {} }: MailboxContainerProps) => {
  const queue = useQueue<MessageType>(mailbox.queue.dxn, { pollInterval: 1_000 });
  return (
    <StackItem.Content toolbar={false}>
      <Mailbox messagesQueue={queue} id={fullyQualifiedId(mailbox)} name={mailbox.name} options={options} />
    </StackItem.Content>
  );
};
