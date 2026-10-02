//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing/index.ts';
import * as Icon from '../Icon/Icon.tsx';
import * as Toggle from './Toggle.tsx';

const DefaultStory = (props: Toggle.RootProps) => {
  return (
    <Toggle.Root {...props}>
      <Icon.Root icon='ph--text-b--regular' />
    </Toggle.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toggle',
  component: Toggle.Root,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Toggle.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
