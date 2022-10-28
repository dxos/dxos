//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { templateForComponent } from '../../testing';
import { Group } from '../Group';
import { Button } from './Button';
import { ButtonProps } from './ButtonProps';

export default {
  title: 'react-ui/Button',
  component: Button
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <>
    <Group label={{ children: null }} elevation={0} className='flex gap-4 px-1 mb-4'>
      {children}
    </Group>
    <Group label={{ children: null }} elevation={5} className='flex gap-4 px-1'>
      {children}
    </Group>
  </>
);

const Template = ({ children, ...args }: Omit<ButtonProps, 'ref'>) => (
  <Container>
    <Button {...args}>{children}</Button>
    <Button {...args} disabled>
      Disabled
    </Button>
  </Container>
);

export const Default = templateForComponent(Template)({});
Default.args = { children: 'Hello', disabled: false, variant: 'default' };

export const Primary = () => <Template {...{ variant: 'primary', children: 'Hello' }} />;

export const Outline = () => <Template {...{ variant: 'outline', children: 'Hello' }} />;
