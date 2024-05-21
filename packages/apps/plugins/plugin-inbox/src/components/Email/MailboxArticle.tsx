//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Mailbox, type MailboxProps } from './Mailbox';

const MailboxArticle = ({ mailbox, options = {} }: MailboxProps) => (
  <div role='none' className='row-span-2 is-full pli-2'>
    <Mailbox mailbox={mailbox} options={options} />
  </div>
);

export default MailboxArticle;
