//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type DataFlowSpec } from './layout.ts';

const SPEC: DataFlowSpec = {
  sources: [{ id: 'mail', label: 'Mail', hue: 'blue' }],
  hub: { label: 'Hypergraph' },
};

/**
 * Two containers joined by one channel, for working on the containers' design: the same frame, well, label and channel
 * the data-flow diagrams draw, with no molecules and nothing moving.
 *
 * Test:
 * 1. Two labelled containers, each a frame with a well, joined by a channel, on warm paper.
 * 2. Tick `molecules` to see molecules flow through them.
 */
const meta: Meta<DataFlowViewProps> = {
  title: 'plugins/plugin-canvas/samples/Containers',
  render: (args) => <DataFlowView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { spec: SPEC, running: true, molecules: false, background: 'paper' },
};

export default meta;

export const Default: StoryObj<DataFlowViewProps> = {};

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
