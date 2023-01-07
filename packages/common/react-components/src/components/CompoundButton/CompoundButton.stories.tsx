//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ArrowRight, ClockCounterClockwise } from 'phosphor-react';
import React, { PropsWithChildren } from 'react';

import { CompoundButton, CompoundButtonProps } from './CompoundButton';

export default {
  component: CompoundButton
};

const Container = ({ children }: PropsWithChildren<{}>) => <div className='flex gap-4'>{children}</div>;

export const Default = {
  render: (args: Omit<CompoundButtonProps, 'ref'>) => (
    <Container>
      <CompoundButton {...args} />
      <CompoundButton {...args} disabled />
    </Container>
  ),
  args: {
    children: 'Hello',
    description: 'This is a compound button',
    before: <ClockCounterClockwise className='w-5 h-5' />,
    after: <ArrowRight className='w-5 h-5' />,
    disabled: false
  }
};

export const Primary = {
  ...Default,
  args: {
    children: 'Hello',
    description: 'This is a compound button',
    before: <ClockCounterClockwise className='w-5 h-5' />,
    after: <ArrowRight className='w-5 h-5' />,
    disabled: false,
    variant: 'primary'
  }
};
