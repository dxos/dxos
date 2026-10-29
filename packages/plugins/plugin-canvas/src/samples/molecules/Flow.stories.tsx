//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { DataFlowSequence, type Scene } from './DataFlowSequence.tsx';
import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { type AppKind, type DataFlowSpec, type SourceSpec } from './layout.ts';
import { type SimulationOptions } from './simulation.ts';

const SPEC: DataFlowSpec = {
  sources: [
    { id: 'mail', label: 'Mail', hue: 'blue' },
    { id: 'docs', label: 'Documents', hue: 'orange' },
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
    { label: 'Sheet', app: 'spreadsheet' },
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
    { label: 'Sheet', app: 'spreadsheet' },
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
  'Slack',
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
  'Contacts',
  'Invoices',
  'Orders',
  'Inventory',
  'Support',
  'Surveys',
  'Leads',
  'Assets',
  'Contracts',
  'Payroll',
  'Travel',
  'Events',
  'Feeds',
  'Budgets',
  'Vendors',
  'Recipes',
  'Projects',
  'Media',
  'Alerts',
  'Metrics',
  'Bookings',
  'Docs',
  'Polls',
  'Grants',
];
// Only hues the diagram has a colour for: any other would draw its source gray.
const MORE_HUES = ['teal', 'amber', 'violet', 'sky', 'red', 'orange', 'green', 'blue', 'fuchsia'];

/**
 * How far each side extends. The first four on each side arrive together, so the growth reads as even; the right runs on
 * well beyond what the pan that follows can reach (twelve seconds of it is under 2000 scene units, a fifth of the extension).
 */
const REACH = { left: { buckets: 4, blocks: 4 }, right: { buckets: 32, blocks: 38 } };

/** The new sources on one side, outward; each side draws its names and hues from its own end of the lists. */
const moreSources = (side: 'left' | 'right'): SourceSpec[] =>
  Array.from({ length: REACH[side].blocks }, (_, index) => {
    const at = side === 'left' ? MORE_NAMES.length - 1 - index : index;
    return { id: `more-${side}-${index}`, label: MORE_NAMES[at], hue: MORE_HUES[at % MORE_HUES.length] };
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
const moreSinks = (side: 'left' | 'right'): { label: string; app?: AppKind }[] =>
  Array.from({ length: REACH[side].blocks }, (_, index) => {
    const number = side === 'left' ? REACH.left.blocks - index : REACH.left.blocks + index + 1;
    return index % 2 === 0
      ? { label: `Agent ${number}` }
      : MORE_APPS[(index + (side === 'left' ? 0 : 2)) % MORE_APPS.length];
  });

/**
 * ECHO extended past the view on both sides, evenly at first and then further to the right for the pan, while all that
 * was there keeps its place.
 */
const EXTENDED: DataFlowSpec = {
  ...APPS,
  hub: { label: '', partitions: 3 },
  extend: {
    left: { buckets: REACH.left.buckets, sources: moreSources('left'), sinks: moreSinks('left') },
    right: { buckets: REACH.right.buckets, sources: moreSources('right'), sinks: moreSinks('right') },
  },
};

/**
 * A universal inbox: mail, Discord and chat feed one ECHO space of four buckets. Molecules take their
 * thread's colour rather than their source's, each thread collects in a bucket of its own, and each bucket has an agent
 * of its own beneath it that reads and writes only that thread.
 */
const INBOX: DataFlowSpec = {
  sources: [
    { id: 'gmail', label: 'Gmail', hue: 'neutral' },
    { id: 'discord', label: 'Discord', hue: 'neutral' },
    { id: 'chat', label: 'Chat', hue: 'neutral' },
  ],
  hub: { label: '', partitions: 4 },
  sinks: [{ label: 'Agent 1' }, { label: 'Agent 2' }, { label: 'Agent 3' }, { label: 'Agent 4' }],
};

/** One hue per thread; the sources and their channels are neutral, so colour reads as the thread alone. */
const THREADS = ['amber', 'sky', 'green', 'fuchsia'];

/**
 * Molecules leave ECHO after 15 seconds, decaying at the full rate from the start rather than once ECHO is half full, so
 * each thread's cluster stays small as it turns over; the agents keep what they take for longer, so they stay busy.
 */
const INBOX_DECAY: SimulationOptions = { hubLifetime: 15, fullDecayAt: 0, sinkLifetime: 40 };

/** Busier apps than the simulation's defaults: they write up about every second and a half, and half of what settles in
 * ECHO syncs down to them, rather than a third. */
const APP_ACTIVITY: SimulationOptions = { upInterval: 1.5, subset: (body) => body.serial % 2 === 0 };

/**
 * The chapters of the story, in order: the one source for each chapter's own story and for the sequence that plays them
 * all. Each keeps its warmup (seconds of flow before it appears), so a chapter opens populated wherever it is shown.
 */
const CHAPTERS: readonly Scene[] = [
  // The first two chapters share one stage: the monolithic agent's parts fade in over the running silos.
  {
    title: 'The Silo Problem',
    caption: 'Users rent their own data-split across multiple vendors.',
    spec: MONOLITH,
    options: APP_ACTIVITY,
    revealed: false,
    // Grid lines for the silos, dots once the agent arrives, and a plain field from ECHO on.
    grid: 'lines',
    stage: 'silos',
    duration: 10,
  },
  {
    title: 'Monolithic Agents',
    caption: 'Users grant agent unrestricted access to their data.',
    spec: MONOLITH,
    options: { ...APP_ACTIVITY, warmup: 8 },
    grid: 'dots',
    stage: 'silos',
    duration: 10,
  },
  // Chapters 3 to 5 share a stage too: the one ECHO space splits into three along its natural breaks, then extends past
  // the view on both sides.
  {
    title: 'ECHO Graph Database',
    caption: 'Data is organized and indexed by context.',
    spec: APPS,
    // The apps open already holding content, so they are writing and syncing from the first frame.
    options: { ...APP_ACTIVITY, warmup: 16, prefill: true },
    partitioned: false,
    // From here on the background is plain, so the eye stays on ECHO.
    grid: 'none',
    stage: 'echo',
    duration: 10,
  },
  {
    title: 'ECHO Hypergraph',
    caption: 'Data is partitioned into secure workspaces.',
    spec: APPS,
    options: { ...APP_ACTIVITY, warmup: 16, prefill: true },
    partitioned: true,
    grid: 'none',
    stage: 'echo',
    duration: 10,
  },
  {
    title: 'Open and Extensible',
    caption: 'DXOS is the Enterprise Operating System.',
    spec: EXTENDED,
    options: { ...APP_ACTIVITY, warmup: 16, prefill: true },
    partitioned: true,
    grid: 'none',
    stage: 'echo',
    duration: 20,
  },
  {
    title: 'Universal Inbox',
    caption: 'Conversations from every channel, gathered by thread.',
    spec: INBOX,
    options: { ...APP_ACTIVITY, ...INBOX_DECAY, warmup: 16, prefill: true, threads: THREADS, threadSinks: true },
    grid: 'none',
    stage: 'inbox',
    duration: 10,
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
  title: 'plugins/plugin-canvas/samples/Flow',
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
  const { title, spec, options, revealed, partitioned, grid } = CHAPTERS[index];
  return { name: `${index + 1}. ${title}`, args: { spec, options, revealed, partitioned, grid } };
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

/** Opens on the chapter before's layout, then moves on to `spec` a moment later, so the change plays as it loads. */
const GrowsIn = ({ spec, before, ...props }: DataFlowViewProps & { before: DataFlowSpec }) => {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), LEAD_IN * 1000);
    return () => clearTimeout(timer);
  }, []);
  return <DataFlowView {...props} spec={grown ? spec : before} continuous />;
};

/**
 * ECHO extends past the view on both sides as new spaces, agents and sources fade in; nothing already there moves.
 * It opens on chapter 4's three buckets and grows from there.
 */
export const Chapter5Growth: Story = {
  ...chapter(4),
  render: (args) => <GrowsIn {...args} before={CHAPTERS[3].spec} />,
};

/** Gmail, Discord and chat feed ECHO's four buckets, one per thread, each with an agent that serves that thread alone. */
export const Chapter6Inbox: Story = chapter(5);

/**
 * Chapters 1 and 2 on one stage: the silos run, then the monolithic agent fades in over them and the camera widens.
 *
 * Test:
 * 1. After 20 seconds (or the next control) the OAuth box, its grant lines, the container and the agent fade in.
 * 2. The silos' molecules keep flowing across the change; the agent then starts reading through OAuth.
 */
export const TransitionAgents: TransitionStory = {
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
