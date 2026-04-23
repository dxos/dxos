//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type ChromaticPalette } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing';
import { Grid } from './Grid';

const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (
  <div data-hue={hue} className='dx-panel p-2 text-sm font-mono border rounded-sm'>
    {label}
  </div>
);

const ColsStory = () => (
  <Grid cols={3} classNames='gap-2 p-2'>
    <Cell label='Row 1' hue='red' />
    <Cell label='Row 2' hue='green' />
    <Cell label='Row 3' hue='blue' />
  </Grid>
);

const RowsStory = () => (
  <Grid rows={3} classNames='gap-2 p-2'>
    <Cell label='Row 1' hue='red' />
    <Cell label='Row 2' hue='green' />
    <Cell label='Row 3' hue='blue' />
  </Grid>
);

const MixedStory = () => (
  <Grid cols={2} rows={2} classNames='gap-2 p-2'>
    <Cell label='A' hue='red' />
    <Cell label='B' hue='green' />
    <Cell label='C' hue='blue' />
    <Cell label='D' hue='yellow' />
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
