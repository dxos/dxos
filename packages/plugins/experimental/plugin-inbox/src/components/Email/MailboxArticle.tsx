//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ScrollArea } from '@dxos/react-ui';

import { Mailbox, type MailboxProps } from './Mailbox';

const MailboxArticle = ({ mailbox, options = {} }: MailboxProps) => (
  <ScrollArea.Root classNames='row-span-2 mx-1'>
    <ScrollArea.Viewport>
      <Mailbox mailbox={mailbox} options={options} />
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar orientation='vertical' variant='fine'>
      <ScrollArea.Thumb />
    </ScrollArea.Scrollbar>
  </ScrollArea.Root>
);

export default MailboxArticle;
