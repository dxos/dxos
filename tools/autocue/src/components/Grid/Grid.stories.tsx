//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { BORDERS } from './border.ts';
import { type Content, Grid, type GridProps } from './Grid.tsx';
import { type Variant, VARIANTS } from './reveal.ts';

const meta: Meta<GridProps> = {
  title: 'tools/autocue/Grid',
  render: Grid,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  // Typed so the story URL can set them (`holds[0]:43300;overlap:12000`); Storybook drops URL args it has no type for.
  argTypes: {
    holds: { type: { name: 'array', value: { name: 'number' } }, control: 'object' },
    overlap: { type: { name: 'number' }, control: 'number' },
    variant: { type: { name: 'enum', value: [...VARIANTS] }, control: 'select', options: VARIANTS },
    montage: { type: { name: 'array', value: { name: 'number' } }, control: 'object' },
    tourSlot: { type: { name: 'number' }, control: 'number' },
    montageSlot: { type: { name: 'number' }, control: 'number' },
    zoomMs: { type: { name: 'number' }, control: 'number' },
    shiftMs: { type: { name: 'number' }, control: 'number' },
    shiftDistance: { type: { name: 'number' }, control: { type: 'select' }, options: [0, 1, 2] },
    overview: { type: { name: 'boolean' }, control: 'boolean' },
    drift: { type: { name: 'number' }, control: { type: 'number', step: 0.05 } },
    border: { type: { name: 'enum', value: [...BORDERS] }, control: 'select', options: BORDERS },
    borderFade: { type: { name: 'boolean' }, control: 'boolean' },
    content: {
      type: { name: 'enum', value: ['clips', 'tours', 'numbers'] },
      control: 'select',
      options: ['clips', 'tours', 'numbers'],
    },
  },
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {
    cols: 6,
    rows: 6,
    gap: 32,
    hold: 10_000,
    pan: 1_500,
    duration: 12_000,
    controls: true,
    stepped: false,
  },
};

/**
 * Three tour cells of row 3 (markdown, projects, inbox) with short holds, for comparing reveals; with `tours` content the
 * fourth tour clip (meeting) sits in the next cell and the rest are numbered.
 */
const variantArgs = (variant: Variant, content: Content): GridProps => ({
  cols: 6,
  rows: 6,
  // A thin gap, as in the After Effects reference: cells nearly edge to edge.
  gap: 12,
  tour: [
    [0, 3],
    [1, 3],
    [2, 3],
  ],
  hold: 3_000,
  pan: 1_500,
  duration: 12_000,
  controls: true,
  stepped: false,
  variant,
  content,
});

export const ZoomNumbers: Story = { args: variantArgs('zoom', 'numbers') };
export const ZoomTours: Story = { args: variantArgs('zoom', 'tours') };
export const ColumnsNumbers: Story = { args: variantArgs('columns', 'numbers') };
export const ColumnsTours: Story = { args: variantArgs('columns', 'tours') };
export const StepsNumbers: Story = { args: variantArgs('steps', 'numbers') };
export const StepsTours: Story = { args: variantArgs('steps', 'tours') };
export const MosaicNumbers: Story = { args: variantArgs('mosaic', 'numbers') };
export const MosaicTours: Story = { args: variantArgs('mosaic', 'tours') };

/**
 * The shift loop: markdown, projects and inbox as 10s close-ups, then ten 3s montage close-ups, each reached by a 1.8s
 * zoom out, row or column shift and zoom in (about 60s in all).
 */
const shiftArgs = (content: Content): GridProps => ({
  ...variantArgs('shift', content),
  tourSlot: 10_000,
  montageSlot: 3_000,
  zoomMs: 600,
  shiftMs: 600,
  shiftDistance: 0,
});

export const ShiftNumbers: Story = { args: shiftArgs('numbers') };
export const ShiftTours: Story = { args: shiftArgs('tours') };
export const ShiftClips: Story = { args: shiftArgs('clips') };

/** The shift loop seen from the zoomed-out 3x3 throughout: only the rows and columns move. */
export const ShiftOverviewNumbers: Story = { args: { ...shiftArgs('numbers'), overview: true } };
export const ShiftOverviewClips: Story = { args: { ...shiftArgs('clips'), overview: true } };

/** The zoomed-out 3x3 with its columns all drifting down slowly and continuously, each at a different speed. */
export const ShiftDriftClips: Story = { args: { ...shiftArgs('clips'), overview: true, drift: 0.2 } };

/**
 * The 16-actor collaboration scene (`stories-agent` Collaboration > Team), one clip per actor: opens full frame on the
 * actor in column 2, row 3, who starts writing first, then zooms out to all sixteen editing the same launch plan.
 * Clips are read from `temp/collab/team/` (see `.agents/projects/multi-actor/DESIGN.md`).
 */
export const Collaboration: Story = {
  args: {
    cols: 4,
    rows: 4,
    gap: 12,
    tour: [[1, 2]],
    hold: 12_000,
    pan: 0,
    duration: 5_000,
    tail: 14_000,
    clipsDir: '../../../../../temp/collab/team/',
    controls: true,
    stepped: false,
  },
};
