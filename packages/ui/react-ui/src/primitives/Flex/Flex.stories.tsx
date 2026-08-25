//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type ChromaticPalette } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing';
import { type Gap, gapClasses } from '../layout';
import { Flex } from './Flex';

const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (
  <div data-hue={hue} className='flex w-full dx-callout p-2 text-sm font-mono border rounded-sm'>
    {label}
  </div>
);

const RowStory = () => (
  <Flex gap='sm' classNames='p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
  </Flex>
);

const ColumnStory = () => (
  <Flex column gap='sm' classNames='p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
  </Flex>
);

const GrowStory = () => (
  <Flex column grow gap='sm' classNames='p-2'>
    <Cell label='Header' hue='yellow' />
    <Flex grow>
      <Cell label='Content (grows)' hue='blue' />
    </Flex>
    <Cell label='Footer' hue='orange' />
  </Flex>
);

/** Every step of the ramp, so a gap change is visible rather than inferred. */
const GapsStory = () => (
  <Flex column gap='lg' classNames='p-2'>
    {(Object.keys(gapClasses) as Gap[]).map((gap) => (
      <Flex key={gap} gap={gap} align='center'>
        <div className='w-28 shrink-0 font-mono text-xs text-description'>{gap}</div>
        <Cell label='A' hue='red' />
        <Cell label='B' hue='green' />
        <Cell label='C' hue='blue' />
      </Flex>
    ))}
  </Flex>
);

/** The empty-state shape: one centered child filling the available block size. */
const CenterStory = () => (
  <Flex center classNames='h-[10rem] m-2 text-subdued border border-separator rounded-sm'>
    Nothing here yet
  </Flex>
);

/** `asChild` projects the layout onto a semantic element without adding a wrapper. */
const AsChildStory = () => (
  <Flex asChild gap='sm' justify='end' classNames='p-2'>
    <footer>
      <Cell label='Cancel' hue='indigo' />
      <Cell label='Save' hue='green' />
    </footer>
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
export const Gaps: Story = { render: GapsStory };
export const Center: Story = { render: CenterStory };
export const AsChild: Story = { render: AsChildStory };
