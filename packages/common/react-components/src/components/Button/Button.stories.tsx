//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { Group } from '../Group';
import { Button } from './Button';
import { ButtonProps } from './ButtonProps';

export default {
  component: Button
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <>
    <Group label={{ children: null }} elevation='base' className='flex gap-4 px-1 mb-4'>
      {children}
    </Group>
    <Group label={{ children: null }} elevation='group' className='flex gap-4 px-1'>
      {children}
    </Group>
  </>
);

export const Default = {
  render: ({ children, ...args }: Omit<ButtonProps, 'ref'>) => (
    <Container>
      <Button {...args}>{children}</Button>
      <Button {...args} disabled>
        Disabled
      </Button>
    </Container>
  ),
  args: { children: 'Hello', disabled: false, variant: 'default' }
};

export const Primary = { ...Default, args: { variant: 'primary', children: 'Hello' } };

export const Outline = { ...Default, args: { variant: 'outline', children: 'Hello' } };

export const Ghost = { ...Default, args: { variant: 'ghost', children: 'Hello' } };
