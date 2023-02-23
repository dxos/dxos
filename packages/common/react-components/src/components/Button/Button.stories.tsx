//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { DensityProvider } from '../DensityProvider';
import { Group } from '../Group';
import { Button } from './Button';
import { ButtonProps } from './ButtonProps';

export default {
  component: Button
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <>
    <Group label={{ children: null, className: 'sr-only' }} elevation='base' className='flex flex-col gap-4 mbe-4'>
      <div className='flex gap-4'>{children}</div>
      <DensityProvider density='fine'>
        <div className='flex gap-4'>{children}</div>
      </DensityProvider>
    </Group>
    <Group label={{ children: null, className: 'sr-only' }} elevation='group' className='flex flex-col gap-4'>
      <div className='flex gap-4'>{children}</div>
      <DensityProvider density='fine'>
        <div className='flex gap-4'>{children}</div>
      </DensityProvider>
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
