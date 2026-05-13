//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type ChromaticPalette } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing';
import { Flex } from './Flex';

const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (
  <div data-hue={hue} className='flex w-full dx-panel p-2 text-sm font-mono border rounded-sm'>
    {label}
  </div>
);

const RowStory = () => (
  <Flex classNames='gap-2 p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
  </Flex>
);

const ColumnStory = () => (
  <Flex column classNames='gap-2 p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
  </Flex>
);

const GrowStory = () => (
  <Flex column grow classNames='gap-2 p-2'>
    <Cell label='Header' hue='yellow' />
    <Flex grow>
      <Cell label='Content (grows)' hue='blue' />
    </Flex>
    <Cell label='Footer' hue='orange' />
  </Flex>
);

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Flex',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Row: Story = { render: RowStory };
export const Column: Story = { render: ColumnStory };
export const Grow: Story = { render: GrowStory };
