//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Icon } from '../Icon';

import { Toggle } from './Toggle';

type StorybookToggleProps = {};

const DefaultStory = (props: StorybookToggleProps) => {
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
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
