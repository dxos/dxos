//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type ChromaticPalette } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing/index.ts';
import * as Grid from './Grid.tsx';

const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (
  <div data-hue={hue} className='dx-callout p-2 text-sm font-mono border rounded-sm'>
    {label}
  </div>
);

const ColsStory = () => (
  <Grid.Grid grow cols={3} gap='sm' classNames='p-2'>
    <Cell label='Row 1' hue='red' />
    <Cell label='Row 2' hue='green' />
    <Cell label='Row 3' hue='blue' />
  </Grid.Grid>
);

const RowsStory = () => (
  <Grid.Grid grow rows={3} gap='sm' classNames='p-2'>
    <Cell label='Row 1' hue='red' />
    <Cell label='Row 2' hue='green' />
    <Cell label='Row 3' hue='blue' />
  </Grid.Grid>
);

const MixedStory = () => (
  <Grid.Grid grow cols={2} rows={2} gap='sm' classNames='p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
    <Cell label='D' hue='yellow' />
  </Grid.Grid>
);

const TracksStory = () => (
  <Grid.Grid grow rows={['min-content', '1fr', 'min-content']} gap='sm' classNames='p-2'>
    <Grid.Grid cols={['min-content', '1fr']} gap='sm' align='center'>
      <Cell label='min-content' hue='red' />
      <Cell label='1fr' hue='green' />
    </Grid.Grid>
    <Grid.Grid cols={[2, 1]} gap='sm'>
      <Cell label='2fr' hue='blue' />
      <Cell label='1fr' hue='yellow' />
    </Grid.Grid>
    <Grid.Grid cols={['30rem', 'minmax(0, 1fr)']} gap='sm'>
      <Cell label='30rem' hue='purple' />
      <Cell label='minmax(0, 1fr)' hue='orange' />
    </Grid.Grid>
  </Grid.Grid>
);

const SubgridStory = () => (
  <Grid.Grid grow cols={['min-content', '1fr', 'min-content']} gap='sm' classNames='p-2'>
    {['A', 'B', 'C'].map((label) => (
      // The row adopts the outer tracks, so every row's columns line up.
      <Grid.Grid key={label} cols='subgrid' gap='sm' align='center'>
        <Cell label={label} hue='red' />
        <Cell label={`content ${label}`} hue='green' />
        <Cell label='⋯' hue='blue' />
      </Grid.Grid>
    ))}
  </Grid.Grid>
);

const meta: Meta = {
  title: 'ui/react-ui-core/layout/Grid',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Cols: Story = { render: ColsStory };
export const Rows: Story = { render: RowsStory };
export const Mixed: Story = { render: MixedStory };
export const Tracks: Story = { render: TracksStory };
export const Subgrid: Story = { render: SubgridStory };
