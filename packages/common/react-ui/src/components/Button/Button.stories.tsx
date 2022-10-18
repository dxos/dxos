//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { ButtonProps } from '../../props';
import { templateForComponent } from '../../testing';
import { Group } from '../Group/Group';
import { Button } from './Button';

export default {
  title: 'react-ui/Button',
  component: Button
};

const Container = ({ children }: PropsWithChildren<{}>) => (
<>
  <div className='flex gap-4 mb-4 px-5'>{children}</div>
  <Group label={{ children: null }} elevation={5} className='flex gap-4 px-1'>{children}</Group>
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
