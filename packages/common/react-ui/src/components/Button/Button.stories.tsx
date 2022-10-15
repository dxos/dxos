//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { templateForComponent } from '../../dev-util';
import { Button, ButtonProps } from './Button';

export default {
  title: 'react-ui/Button',
  component: Button
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <div className='flex gap-4'>{children}</div>
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
