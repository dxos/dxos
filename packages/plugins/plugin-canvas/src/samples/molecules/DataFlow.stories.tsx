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
    { id: 'finance', label: 'Finance', hue: 'green' },
    { id: 'ops', label: 'Ops', hue: 'fuchsia' },
  ],
  hub: { label: 'ECHO', partitions: 3 },
  sinks: [{ label: 'Agent' }],
};

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

const MONOLITH: DataFlowSpec = { ...SILOS, monolith: true, hub: { label: 'Agent' } };

const APPS: DataFlowSpec = {
  ...SPEC,
  // One bucket, laid out partitioned so the next chapter can split it in place.
  hub: { label: 'ECHO', partitions: 1 },
  sinks: [
    { label: 'Docs', app: 'document' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Board', app: 'kanban' },
    { label: 'Chat', app: 'messaging' },
  ],
};

/**
 * The chapters of the story, in order: the one source for each chapter's own story and for the sequence that plays them
 * all. Each keeps its warmup (seconds of flow before it appears), so a chapter opens populated wherever it is shown.
 */
const CHAPTERS: readonly Scene[] = [
  // The first two chapters share one stage: the monolithic agent's parts fade in over the running silos.
  {
    title: 'Silos',
    caption: 'Each application keeps its own data, fed only by its own source.',
    spec: MONOLITH,
    revealed: false,
    stage: 'silos',
    duration: 20,
  },
  {
    title: 'Monolithic Agents',
    caption: 'One agent reaches into every source at once, beside the apps.',
    spec: MONOLITH,
    options: { warmup: 8 },
    stage: 'silos',
    duration: 20,
  },
  // Chapters 3 to 5 share a stage too: the one ECHO space splits into three along its natural breaks, then the two apps
  // on the right give way to agents.
  {
    title: 'A shared ECHO',
    caption: 'The sources feed one ECHO space, and the apps sync from it.',
    spec: APPS,
    options: { warmup: 16 },
    partitioned: false,
    stage: 'echo',
    duration: 24,
  },
  {
    title: 'Spaces',
    caption: 'ECHO splits into spaces along the natural breaks in its data.',
    spec: APPS,
    options: { warmup: 16 },
    partitioned: true,
    stage: 'echo',
    duration: 20,
  },
  {
    title: 'Apps and agents together',
    caption: 'Applications and agents share the same partitioned ECHO space, side by side.',
    spec: APPS,
    options: { warmup: 16 },
    partitioned: true,
    // The two apps on the right give way to agents, which fill from what ECHO syncs down to them.
    sinks: [
      { label: 'Docs', app: 'document' },
      { label: 'Sheets', app: 'spreadsheet' },
      { label: 'Agent 1' },
      { label: 'Agent 2' },
    ],
    stage: 'echo',
    duration: 24,
  },
];

/**
 * Test:
 * 1. Molecules of each source's colour form on the hex grid of the boxes at the top, then flow down their channels.
 * 2. In the hub each drops onto the lattice in a random section, bonds to its edge and blinks in step with the others;
 *    every third docked molecule (dashed ring) syncs a copy down to the agents and apps below.
 * 3. Both lattices are caches: past its lifetime a molecule fades from the exposed edge.
 * 4. The bar at the bottom right picks the theme (paper by default) and the grid over its background.
 * 5. Untick `running` to freeze the frame; wheel and drag still pan and zoom the canvas.
 */
const meta: Meta<DataFlowViewProps> = {
  title: 'plugins/plugin-canvas/samples/DataFlow',
  render: (args) => <DataFlowView {...args} />,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { spec: SPEC, running: true },
};

export default meta;

type Story = StoryObj<DataFlowViewProps>;

const chapter = (index: number): Story => {
  const { title, spec, options, revealed, partitioned, sinks } = CHAPTERS[index];
  return { name: `${index + 1}. ${title}`, args: { spec, options, revealed, partitioned, sinks } };
};

/**
 * The whole story in one: every chapter in order, each under its caption, fading into the next.
 *
 * Test:
 * 1. Chapters advance by themselves every 20 to 30 seconds and stop at the last; the counter shows which is playing.
 * 2. The controls at the top right step back, pause or resume, and step forward.
 */
export const Default: Story = {
  render: () => <DataFlowSequence scenes={CHAPTERS} />,
};

/** Each source feeds only its own application, with no hub to mix them; now and then an app writes back. */
export const Chapter1Silos: Story = chapter(0);

/** One monolithic agent beside the apps reads every source at once through its OAuth container. */
export const Chapter2Monolith: Story = chapter(1);

/** The sources feed one ECHO space, and the apps sync their content from it. */
export const Chapter3Echo: Story = chapter(2);

/** The one ECHO space splits into three along the natural breaks in its lattice; molecules then land in the new spaces. */
export const Chapter4Spaces: Story = chapter(3);

/** Applications and agents side by side on the same partitioned ECHO space. */
export const Chapter5Mixed: Story = chapter(4);

/**
 * Chapters 1 and 2 on one stage: the silos run, then the monolithic agent fades in over them and the camera widens.
 *
 * Test:
 * 1. After 20 seconds (or the next control) the OAuth box, its grant lines, the container and the agent fade in.
 * 2. The silos' molecules keep flowing across the change; the agent then starts reading through OAuth.
 */
export const Transition: Story = {
  render: () => <DataFlowSequence scenes={CHAPTERS.slice(0, 2)} />,
};
