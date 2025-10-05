//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { Icon } from '../Icon';

import { ToggleGroup, ToggleGroupItem, type ToggleGroupProps } from './ToggleGroup';

// TODO(burdon): Create Radix-style Root, Item, etc?
const DefaultStory = (props: ToggleGroupProps) => {
  return (
    <ToggleGroup {...props}>
      <ToggleGroupItem value='textb'>
        <Icon icon='ph--text-b--regular' />
      </ToggleGroupItem>
      <ToggleGroupItem value='texti'>
        <Icon icon='ph--text-italic--regular' />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

const meta = {
  title: 'ui/react-ui-core/ToggleGroup',
  component: ToggleGroup,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: { chromatic: { disableSnapshot: false } },
} satisfies Meta<typeof ToggleGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'single',
  },
};
