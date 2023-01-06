//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ArrowRight, ClockCounterClockwise } from 'phosphor-react';
import React, { PropsWithChildren } from 'react';

import { templateForComponent } from '../../testing';
import { CompoundButton, CompoundButtonProps } from './CompoundButton';

export default {
  title: 'react-ui/CompoundButton',
  component: CompoundButton
};

const Container = ({ children }: PropsWithChildren<{}>) => <div className='flex gap-4'>{children}</div>;

const Template = ({ ...args }: Omit<CompoundButtonProps, 'ref'>) => (
  <Container>
    <CompoundButton {...args} />
    <CompoundButton {...args} disabled />
  </Container>
);

export const Default = templateForComponent(Template)({});
Default.args = {
  children: 'Hello',
  description: 'This is a compound button',
  before: <ClockCounterClockwise className='w-5 h-5' />,
  after: <ArrowRight className='w-5 h-5' />,
  disabled: false
};

export const Primary = () => (
  <Template
    {...{
      children: 'Hello',
      description: 'This is a compound button',
      before: <ClockCounterClockwise className='w-5 h-5' />,
      after: <ArrowRight className='w-5 h-5' />,
      disabled: false,
      variant: 'primary'
    }}
  />
);
