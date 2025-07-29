//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React, { type PropsWithChildren } from 'react';

import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { CompoundButton, type CompoundButtonProps } from './CompoundButton';

export default {
  title: 'sdk/shell/CompoundButton',
  component: CompoundButton,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
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
    before: <Icon icon='ph--clock-counter-clockwise' classNames='w-5 h-5' />,
    after: <Icon icon='ph--arrow-right' classNames='w-5 h-5' />,
    disabled: false,
  },
};

export const Primary = {
  ...Default,
  args: {
    children: 'Hello',
    description: 'This is a compound button',
    before: <Icon icon='ph--clock-counter-clockwise' classNames='w-5 h-5' />,
    after: <Icon icon='ph--arrow-right' classNames='w-5 h-5' />,
    disabled: false,
    variant: 'primary',
  },
};
