//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Mailbox, type MailboxProps } from './Mailbox';

export const MailboxContainer = ({ mailbox, options = {} }: MailboxProps) => (
  <div role='none' className='flex row-span-2 overflow-hidden'>
    <Mailbox mailbox={mailbox} options={options} />
  </div>
);
