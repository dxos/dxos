//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Mailbox, type MailboxProps } from './Mailbox';

export const MailboxContainer = ({ mailbox, options = {} }: MailboxProps) => (
  <div role='none' className={mx('flex row-span-2')}>
    <ScrollArea.Root classNames='row-span-2 mx-1'>
      <ScrollArea.Viewport>
        <Mailbox mailbox={mailbox} options={options} />
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical' variant='fine'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  </div>
);
