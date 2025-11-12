//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { CompoundButton, type CompoundButtonProps } from './CompoundButton';

const DefaultStory = (props: CompoundButtonProps) => {
  return (
    <Container>
      <CompoundButton {...props} />
      <CompoundButton {...props} disabled />
    </Container>
  );
};

const meta = {
  title: 'sdk/shell/CompoundButton',
  component: CompoundButton,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof CompoundButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const Container = ({ children }: PropsWithChildren<{}>) => <div className='flex gap-4'>{children}</div>;

export const Default: Story = {
  args: {
    children: 'Hello',
    description: 'This is a compound button',
    before: <Icon icon='ph--clock-counter-clockwise' classNames='is-5 bs-5' />,
    after: <Icon icon='ph--arrow-right' classNames='is-5 bs-5' />,
    disabled: false,
  },
};

export const Primary: Story = {
  args: {
    children: 'Hello',
    description: 'This is a compound button',
    before: <Icon icon='ph--clock-counter-clockwise' classNames='is-5 bs-5' />,
    after: <Icon icon='ph--arrow-right' classNames='is-5 bs-5' />,
    disabled: false,
    variant: 'primary',
  },
};
