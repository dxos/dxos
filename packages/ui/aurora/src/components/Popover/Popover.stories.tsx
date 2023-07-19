//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren, ReactNode } from 'react';

import { Button } from '../Buttons';
import { Popover } from './Popover';

const StorybookPopover = ({ openTrigger, children }: PropsWithChildren<{ openTrigger: ReactNode }>) => {
  return (
    <Popover.Root defaultOpen>
      <Popover.Trigger asChild>{openTrigger}</Popover.Trigger>
      <Popover.Content>
        {children}
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

export default {
  component: StorybookPopover,
};

export const Default = {
  args: {
    openTrigger: <Button>Open popover</Button>,
    children: 'Popover content',
  },
};
