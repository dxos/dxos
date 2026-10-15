//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowSequence, type Scene } from './DataFlowSequence.tsx';
import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type DataFlowSpec } from './layout.ts';

const SPEC: DataFlowSpec = {
  sources: [
    { id: 'mail', label: 'Mail', hue: 'blue' },
    { id: 'docs', label: 'Docs', hue: 'orange' },
    { id: 'sheets', label: 'Sheets', hue: 'green' },
    { id: 'realtime', label: 'Realtime', hue: 'fuchsia' },
  ],
  hub: { label: 'Hypergraph', partitions: 3 },
  sinks: [{ label: 'Agent' }],
};

/**
 * Test:
 * 1. Molecules of each source's colour form on the hex grid of the four boxes at the top, then flow down the middle of
 *    their channels.
 * 2. In the hub each moves sideways along the empty lane above the band to a random section, drops onto the lattice,
 *    bonds to its edge (shifting its atoms to fill a gap) and blinks three times in step with the others.
 * 3. Every third docked molecule (dashed ring) syncs a copy down to the agent; now and then the agent writes one that
 *    rises to the hub and, sometimes, back to its source's grid.
 * 4. Both lattices are caches: past its lifetime a molecule fades from the exposed edge, taking its agent copy with it.
 * 5. Untick `running` to freeze the frame; wheel and drag still pan and zoom the canvas.
 */
const meta: Meta<DataFlowViewProps> = {
  title: 'plugins/plugin-canvas/samples/DataFlow',
  render: (args) => <DataFlowView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { spec: SPEC, running: true },
};

export default meta;

export const Default: StoryObj<DataFlowViewProps> = {};

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
  hub: { label: 'Hypergraph' },
};

const AGENTS: DataFlowSpec = {
  ...SPEC,
  sinks: [{ label: 'Agent 1' }, { label: 'Agent 2' }, { label: 'Agent 3' }],
};

const SPAWN = { spawnAgents: { first: 2, every: 10 } };

/**
 * Up to three agents, none at first: once the hub is syncing they appear one by one under it, each catching up on what
 * the hub already holds before sharing in the ongoing sync.
 */
export const Agents: StoryObj<DataFlowViewProps> = { args: { spec: AGENTS, options: SPAWN } };

const APPS: DataFlowSpec = {
  ...SPEC,
  sinks: [
    { label: 'Docs', app: 'document' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Board', app: 'kanban' },
    { label: 'Chat', app: 'messaging' },
  ],
};

/**
 * Applications in place of agents, all open from the start: a molecule flowing down to an app stops at the end of its
 * channel and lights up the content it brings (a text line, a cell, a card); now and then a piece of content lights up
 * and a molecule leaves from the channel's mouth for the hub.
 */
export const Apps: StoryObj<DataFlowViewProps> = { args: { spec: APPS } };

const SILOS: DataFlowSpec = {
  ...SPEC,
  variant: 'silos',
  sinks: [
    { label: 'Inbox', app: 'list' },
    { label: 'Document', app: 'document' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Board', app: 'kanban' },
  ],
};

/**
 * Silos: each source feeds only its own application, down a channel of its own, with no hub to mix them; now and then
 * an app writes a piece of its content back up to its source. Molecules stay in the channels; the apps light up.
 */
export const Silos: StoryObj<DataFlowViewProps> = { args: { spec: SILOS } };

const MONOLITH: DataFlowSpec = { ...SILOS, monolith: true, hub: { label: 'Agent' }, group: { label: 'OAuth' } };

/**
 * The silos with one monolithic agent, a peer of the applications, that reads every source at once: as molecules form,
 * copies of about half of them appear in the OAuth container above the agent's channel and drop into its lattice,
 * while the originals still flow down to their own apps.
 */
export const Monolith: StoryObj<DataFlowViewProps> = { args: { spec: MONOLITH } };

/** Nine sources around a round hub, which grows as a cluster from its centre; there is no agent below. */
export const Radial: StoryObj<DataFlowViewProps> = { args: { spec: RADIAL } };

const MIXED: DataFlowSpec = {
  ...SPEC,
  sinks: [
    { label: 'Docs', app: 'document' },
    { label: 'Agent 1' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Agent 2' },
  ],
};

/** A few seconds of flow before a scene appears, so it opens with its lattices already growing. */
const WARM = { warmup: 8 };

/** Longer, for a scene whose sinks only start syncing once the hub holds a few molecules. */
const WARMER = { warmup: 16 };

/** Longest, for agents, which fill only from the share of the hub synced down to them. */
const WARMEST = { warmup: 30 };

const SCENES: Scene[] = [
  {
    title: 'Silos',
    caption: 'Each application keeps its own data, fed only by its own source.',
    spec: SILOS,
    duration: 20,
  },
  {
    title: 'A monolithic agent',
    caption: 'One agent reaches into every source at once, beside the apps.',
    spec: MONOLITH,
    options: WARM,
    duration: 20,
  },
  {
    title: 'A shared hypergraph',
    caption: 'The sources feed one partitioned hypergraph, and the apps sync from it.',
    spec: APPS,
    options: WARMER,
    duration: 24,
  },
  {
    title: 'Apps and agents together',
    caption: 'Applications and agents share the same hypergraph, side by side.',
    spec: MIXED,
    options: WARMEST,
    duration: 24,
  },
];

/**
 * The whole story in one: silos, then a monolithic agent beside them, then a shared hypergraph between the sources and
 * the apps, then apps and agents together on it. Each scene plays under its caption and fades into the next.
 *
 * Test:
 * 1. Scenes advance by themselves about every 20 seconds and loop; the counter shows which is playing.
 * 2. The controls at the top right step back, pause or resume, and step forward.
 */
export const Story: StoryObj<DataFlowViewProps> = {
  render: () => <DataFlowSequence scenes={SCENES} />,
};
