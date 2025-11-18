//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Icon } from '../Icon';

import { Toggle, type ToggleProps } from './Toggle';

const DefaultStory = (props: ToggleProps) => {
  return (
    <Toggle {...props}>
      <Icon icon='ph--text-b--regular' />
    </Toggle>
  );
};

const meta = {
  title: 'ui/react-ui-core/Toggle',
  component: Toggle,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
