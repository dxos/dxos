//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowSequence, type Scene } from './DataFlowSequence.tsx';
import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type AppKind, type DataFlowSpec, type SourceSpec } from './layout.ts';

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
  // Unlabelled: the container stands for ECHO without saying so, its well inset alike on every side.
  hub: { label: '', partitions: 1 },
  sinks: [
    { label: 'Docs', app: 'document' },
    { label: 'Sheets', app: 'spreadsheet' },
    { label: 'Board', app: 'kanban' },
    { label: 'Chat', app: 'messaging' },
  ],
};

/** Names and hues the extended diagram's sources take, in turn, outward from the four it had, alternating sides. */
const MORE_NAMES = [
  'Calendar',
  'Code',
  'CRM',
  'Files',
  'Chat',
  'Tickets',
  'Sensors',
  'Billing',
  'Wiki',
  'Design',
  'Logs',
  'HR',
  'Maps',
  'Photos',
  'Notes',
  'Tasks',
  'Forms',
  'Email',
  'Analytics',
  'Search',
];
// Only hues the diagram has a colour for: any other would draw its source gray.
const MORE_HUES = ['teal', 'amber', 'violet', 'sky', 'red', 'orange', 'green', 'blue', 'fuchsia'];

/** How far each side extends: far enough past the view (about three times its width) to read as going on without end. */
const REACH = { buckets: 9, blocks: 10 };

const moreSources = (side: 0 | 1): SourceSpec[] =>
  Array.from({ length: REACH.blocks }, (_, index) => {
    const at = 2 * index + side;
    return { id: `more-${at}`, label: MORE_NAMES[at % MORE_NAMES.length], hue: MORE_HUES[at % MORE_HUES.length] };
  });

/** Applications the bottom row's newcomers take, in turn, between the agents. */
const MORE_APPS: readonly { label: string; app: AppKind }[] = [
  { label: 'Notes', app: 'document' },
  { label: 'Budget', app: 'spreadsheet' },
  { label: 'Roadmap', app: 'kanban' },
  { label: 'Inbox', app: 'list' },
  { label: 'Team', app: 'messaging' },
];

/** The bottom row's newcomers, outward on one side: agents and applications in turn, agents numbered left to right. */
const moreSinks = (side: -1 | 1): { label: string; app?: AppKind }[] =>
  Array.from({ length: REACH.blocks }, (_, index) => {
    const number = side < 0 ? REACH.blocks - index : REACH.blocks + index + 1;
    return index % 2 === 0 ? { label: `Agent ${number}` } : MORE_APPS[(index + (side < 0 ? 0 : 2)) % MORE_APPS.length];
  });

/** ECHO extended past the view on both sides, while all that was there keeps its place; agents number left to right. */
const EXTENDED: DataFlowSpec = {
  ...APPS,
  hub: { label: '', partitions: 3 },
  extend: {
    left: {
      buckets: REACH.buckets,
      sources: moreSources(0),
      sinks: moreSinks(-1),
    },
    right: {
      buckets: REACH.buckets,
      sources: moreSources(1),
      sinks: moreSinks(1),
    },
  },
};

/**
 * The chapters of the story, in order: the one source for each chapter's own story and for the sequence that plays them
 * all. Each keeps its warmup (seconds of flow before it appears), so a chapter opens populated wherever it is shown.
 */
const CHAPTERS: readonly Scene[] = [
  // The first two chapters share one stage: the monolithic agent's parts fade in over the running silos.
  {
    title: 'The Silo Problem',
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
  // Chapters 3 to 5 share a stage too: the one ECHO space splits into three along its natural breaks, then extends past
  // the view on both sides.
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
    title: 'Room to grow',
    caption:
      'ECHO extends past every edge: new spaces, apps, agents and sources join while all that was there runs on.',
    spec: EXTENDED,
    options: { warmup: 16 },
    partitioned: true,
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

type TransitionStory = StoryObj<{ autostart: boolean }>;

/** Seconds the first scene of a transition plays before moving on, when the story starts the transition itself. */
const LEAD_IN = 2;

/** A transition's scenes: with `autostart`, the first gives way after a moment, so the change plays as the story loads. */
const transition = (scenes: readonly Scene[], autostart: boolean): Scene[] =>
  scenes.map((scene, index) => (index === 0 && autostart ? { ...scene, duration: LEAD_IN } : scene));

const chapter = (index: number): Story => {
  const { title, spec, options, revealed, partitioned } = CHAPTERS[index];
  return { name: `${index + 1}. ${title}`, args: { spec, options, revealed, partitioned } };
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

/** ECHO extends past the view on both sides as new spaces, agents and sources fade in; nothing already there moves. */
export const Chapter5Growth: Story = chapter(4);

/**
 * Chapters 1 and 2 on one stage: the silos run, then the monolithic agent fades in over them and the camera widens.
 *
 * Test:
 * 1. After 20 seconds (or the next control) the OAuth box, its grant lines, the container and the agent fade in.
 * 2. The silos' molecules keep flowing across the change; the agent then starts reading through OAuth.
 */
export const TransitionOAuth: TransitionStory = {
  render: ({ autostart }) => <DataFlowSequence scenes={transition(CHAPTERS.slice(0, 2), autostart)} />,
  args: { autostart: true },
};

/**
 * Chapters 4 and 5 on one stage: ECHO, already split, extends past the view on both sides.
 *
 * Test:
 * 1. Next stretches ECHO off both edges; its three buckets, the four sources and the four apps stay exactly in place.
 * 2. New buckets fade in either side within ECHO, and new sources and agents fade in beyond the old ones.
 */
export const TransitionExtension: TransitionStory = {
  render: ({ autostart }) => <DataFlowSequence scenes={transition(CHAPTERS.slice(3, 5), autostart)} />,
  args: { autostart: true },
};
