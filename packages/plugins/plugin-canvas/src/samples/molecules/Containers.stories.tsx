//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type DataFlowSpec } from './layout.ts';

const SPEC: DataFlowSpec = {
  sources: [{ id: 'mail', label: 'Mail', hue: 'blue' }],
  hub: { label: 'ECHO' },
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
  args: { spec: SPEC, running: true, molecules: false },
};

export default meta;

export const Default: StoryObj<DataFlowViewProps> = {};

const HYPERGRAPH: DataFlowSpec = {
  sources: [
    { id: 'mail', label: 'Mail', hue: 'blue' },
    { id: 'docs', label: 'Documents', hue: 'orange' },
    { id: 'finance', label: 'Finance', hue: 'green' },
    { id: 'ops', label: 'Ops', hue: 'fuchsia' },
  ],
  hub: { label: 'ECHO', partitions: 3 },
  focus: 'hub',
};

const WARM = { warmup: 60 };

// Unlabelled, and laid out partitioned from the start, so the container keeps its height as it splits.
const ONE_BUCKET: DataFlowSpec = { ...HYPERGRAPH, hub: { label: '', partitions: 1 } };

/** Toggles the split every few seconds, so the story plays it both ways on a loop. */
const SplitLoop = (props: DataFlowViewProps) => {
  const [partitioned, setPartitioned] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setPartitioned((value) => !value), SPLIT_PERIOD);
    return () => clearInterval(timer);
  }, []);
  return <DataFlowView {...props} partitioned={partitioned} />;
};

const SPLIT_PERIOD = 5_000;

/**
 * The ECHO container's one bucket split into three at the lattice's natural break points: its clusters slide whole into
 * their columns, then the buckets open around them.
 */
export const Split: StoryObj<DataFlowViewProps> = {
  render: (args) => <SplitLoop {...args} />,
  args: { spec: ONE_BUCKET, options: WARM, molecules: true, running: false },
};

const RADIAL: DataFlowSpec = {
  variant: 'radial',
  sources: [
    { id: 'email', label: 'Email', hue: 'green' },
    { id: 'calendar', label: 'Calendar', hue: 'teal' },
    { id: 'docs', label: 'Documents', hue: 'sky' },
    { id: 'crm', label: 'CRM', hue: 'blue' },
    { id: 'chat', label: 'Chat', hue: 'violet' },
    { id: 'tickets', label: 'Tickets', hue: 'red' },
    { id: 'code', label: 'Code', hue: 'orange' },
    { id: 'files', label: 'Files', hue: 'amber' },
    { id: 'sensors', label: 'Sensors', hue: 'neutral' },
  ],
  hub: { label: 'ECHO' },
};

/** Nine sources around a round hub, which grows as a cluster from its centre. */
export const Radial: StoryObj<DataFlowViewProps> = { args: { spec: RADIAL, molecules: true } };
