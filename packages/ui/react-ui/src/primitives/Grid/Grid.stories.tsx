//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type ChromaticPalette } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing';
import { Grid } from './Grid';

const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (
  <div data-hue={hue} className='dx-callout p-2 text-sm font-mono border rounded-sm'>
    {label}
  </div>
);

const ColsStory = () => (
  <Grid cols={3} gap='sm' classNames='p-2'>
    <Cell label='Row 1' hue='red' />
    <Cell label='Row 2' hue='green' />
    <Cell label='Row 3' hue='blue' />
  </Grid>
);

const RowsStory = () => (
  <Grid rows={3} gap='sm' classNames='p-2'>
    <Cell label='Row 1' hue='red' />
    <Cell label='Row 2' hue='green' />
    <Cell label='Row 3' hue='blue' />
  </Grid>
);

const MixedStory = () => (
  <Grid cols={2} rows={2} gap='sm' classNames='p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
    <Cell label='D' hue='yellow' />
  </Grid>
);

const TracksStory = () => (
  <Grid rows={['min-content', '1fr', 'min-content']} gap='sm' classNames='p-2'>
    <Grid cols={['min-content', '1fr']} grow={false} gap='sm' align='center'>
      <Cell label='min-content' hue='red' />
      <Cell label='1fr' hue='green' />
    </Grid>
    <Grid cols={[2, 1]} grow={false} gap='sm'>
      <Cell label='2fr' hue='blue' />
      <Cell label='1fr' hue='yellow' />
    </Grid>
    <Grid cols={['30rem', 'minmax(0, 1fr)']} grow={false} gap='sm'>
      <Cell label='30rem' hue='purple' />
      <Cell label='minmax(0, 1fr)' hue='orange' />
    </Grid>
  </Grid>
);

const SubgridStory = () => (
  <Grid cols={['min-content', '1fr', 'min-content']} gap='sm' classNames='p-2'>
    {['A', 'B', 'C'].map((label) => (
      // The row adopts the outer tracks, so every row's columns line up.
      <Grid key={label} cols='subgrid' grow={false} gap='sm' align='center'>
        <Cell label={label} hue='red' />
        <Cell label={`content ${label}`} hue='green' />
        <Cell label='⋯' hue='blue' />
      </Grid>
    ))}
  </Grid>
);

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Grid',
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
