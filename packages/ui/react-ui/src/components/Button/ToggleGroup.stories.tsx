//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing/index.ts';
import * as Icon from '../Icon/Icon.tsx';
import * as ToggleGroup from './ToggleGroup.tsx';

// TODO(burdon): Create composite Root, Item, etc?
const DefaultStory = (props: ToggleGroup.RootProps) => {
  return (
    <ToggleGroup.Root {...props}>
      <ToggleGroup.Item value='textb'>
        <Icon.Root icon='ph--text-b--regular' />
      </ToggleGroup.Item>
      <ToggleGroup.Item value='texti'>
        <Icon.Root icon='ph--text-italic--regular' />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/ToggleGroup',
  component: ToggleGroup.Root,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof ToggleGroup.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'single',
  },
};
