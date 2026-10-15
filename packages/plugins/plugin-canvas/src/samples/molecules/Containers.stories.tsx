//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type DataFlowSpec } from './layout.ts';
import { GRIDS, LOOKS } from './MoleculeOverlay.tsx';

const SPEC: DataFlowSpec = {
  sources: [{ id: 'mail', label: 'Mail', hue: 'blue' }],
  hub: { label: 'Hypergraph' },
};

/**
 * Two containers joined by one channel, for working on the containers' design: the same frame, well, label and channel
 * the data-flow diagrams draw, with no molecules and nothing moving.
 *
 * Test:
 * 1. Two labelled containers, each a frame with a white well, joined by a channel.
 * 2. Tick `molecules` to see molecules flow through them.
 */
const meta: Meta<DataFlowViewProps> = {
  title: 'plugins/plugin-canvas/samples/Containers',
  render: (args) => <DataFlowView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { spec: SPEC, running: true, molecules: false },
};

export default meta;

export const Default: StoryObj<DataFlowViewProps> = {};

const APPS: DataFlowSpec = {
  variant: 'silos',
  sources: [
    { id: 'mail', label: 'Mail', hue: 'blue' },
    { id: 'docs', label: 'Docs', hue: 'orange' },
    { id: 'sheets', label: 'Sheets', hue: 'green' },
    { id: 'realtime', label: 'Realtime', hue: 'fuchsia' },
    { id: 'chat', label: 'Chat', hue: 'teal' },
  ],
  hub: { label: 'Hypergraph' },
  sinks: [
    { label: 'Inbox', app: 'list' },
    { label: 'Document', app: 'document' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Board', app: 'kanban' },
    { label: 'Messaging', app: 'messaging' },
  ],
};

const PREFILL = { prefill: true };

/**
 * Every application view, each under its source, with content already in it: mostly settled, a little fresh. Drawn in
 * the default glass look; pick another `look` to compare.
 */
export const Apps: StoryObj<DataFlowViewProps> = {
  args: { spec: APPS, options: PREFILL, look: 'glass', grid: 'dots' },
  argTypes: {
    look: { control: 'inline-radio', options: LOOKS },
    grid: { control: 'inline-radio', options: GRIDS },
  },
};

/** Modern: dark cards with hairline borders, dark panels for wells, solid muted channels; no gradients or shadows. */
export const AppsFlat: StoryObj<DataFlowViewProps> = { ...Apps, args: { ...Apps.args, look: 'flat' } };

/** Modern: line art: outlined cards, wells and content with no fills, and channels drawn as rails. */
export const AppsOutline: StoryObj<DataFlowViewProps> = { ...Apps, args: { ...Apps.args, look: 'outline' } };

/** The original look: raised gray frames on darker bases, white inset wells, and shaded tubes. */
export const AppsClassic: StoryObj<DataFlowViewProps> = { ...Apps, args: { ...Apps.args, look: 'classic' } };

const HYPERGRAPH: DataFlowSpec = {
  sources: [
    { id: 'mail', label: 'Mail', hue: 'blue' },
    { id: 'docs', label: 'Docs', hue: 'orange' },
    { id: 'sheets', label: 'Sheets', hue: 'green' },
    { id: 'realtime', label: 'Realtime', hue: 'fuchsia' },
  ],
  hub: { label: 'Hypergraph', partitions: 3 },
  focus: 'hub',
};

const WARM = { warmup: 60 };

/** The hypergraph's container on its own, holding the lattice a minute of data flow grows in it. */
export const Hypergraph: StoryObj<DataFlowViewProps> = {
  args: { spec: HYPERGRAPH, options: WARM, molecules: true, running: false },
};

/** The glass look over a grid of lines along the minor and major grid, in place of dots. */
export const AppsLines: StoryObj<DataFlowViewProps> = { ...Apps, args: { ...Apps.args, grid: 'lines' } };
