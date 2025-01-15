//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { Mailbox, type MailboxProps } from './Mailbox';

export const MailboxContainer = ({ mailbox, options = {} }: MailboxProps) => (
  <StackItem.Content toolbar={false}>
    <Mailbox mailbox={mailbox} options={options} />
  </StackItem.Content>
);
