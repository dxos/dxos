//
// Copyright 2026 DXOS.org
//

import type * as ProjectMailboxOperation from '@dxos/plugin-projects/ProjectMailboxOperation';

/** One #general message: who posted it, how many days before the reference date, and what it says. */
export type MessageSeed = {
  readonly key: string;
  readonly name: string;
  readonly daysAgo: number;
  readonly text: string;
};

/** The channel's members are fictional; the questions are the kind a community channel gets every week. */
export const MESSAGES: readonly MessageSeed[] = [
  {
    key: 'maya',
    name: 'Maya',
    daysAgo: 20,
    text: 'Just went through the Composer tour, it looks great! Is there a series of short videos on building a first plugin? Five-minute clips per feature would be perfect.',
  },
  {
    key: 'ivo',
    name: 'Ivo',
    daysAgo: 17,
    text: 'Is there a guide to customizing storage? I would like to keep my spaces on an external drive.',
  },
  {
    key: 'sana',
    name: 'Sana',
    daysAgo: 14,
    text: 'Found a small bug: after I rename a space, the sidebar keeps showing the old name until I reload.',
  },
  {
    key: 'theo',
    name: 'Theo',
    daysAgo: 11,
    text: 'Feature request: let me pin a channel to the top of the navigation tree so it is always one click away.',
  },
  {
    key: 'lena',
    name: 'Lena',
    daysAgo: 8,
    text: 'Sharing our write-up on CRDT merge benchmarks across three local-first frameworks: https://example.com/crdt-benchmarks',
  },
  { key: 'kofi', name: 'Kofi', daysAgo: 5, text: 'hey all 👋' },
  { key: 'ana', name: 'Ana', daysAgo: 3, text: 'hello from Lisbon!' },
  { key: 'jun', name: 'Jun', daysAgo: 1, text: 'gm' },
];

/** Canned triage, matched by a substring of the message text the prompt quotes. */
export type Script = readonly { readonly match: string; readonly result: ProjectMailboxOperation.TriageResult }[];

/**
 * What a model would answer for the messages that need anything, so the template's routine runs with the
 * scripted model (`?model=scripted`). The replies promise nothing: each is a draft a person reviews first.
 */
export const SCRIPT: Script = [
  {
    match: 'short videos on building a first plugin',
    result: {
      reply:
        "Thanks Maya, glad you liked the tour! There isn't a video series yet, and five-minute clips per feature is a great idea. What would you like to build first? We'll follow up with a starting point.",
      tasks: [
        { kind: 'docs', title: 'Record five-minute videos on building a first plugin' },
        { kind: 'action', title: 'Ask Maya what she wants to build and suggest a starting point' },
      ],
    },
  },
  {
    match: 'guide to customizing storage',
    result: {
      reply: "There isn't a guide for that yet. The team will follow up with pointers on where spaces are stored.",
      tasks: [{ kind: 'docs', title: 'Write a guide to customizing storage' }],
    },
  },
  {
    match: 'after I rename a space',
    result: {
      reply: 'Thanks for the report, Sana! We have filed it and will let you know when it is fixed.',
      tasks: [
        {
          kind: 'bug',
          title: 'Sidebar keeps the old name of a renamed space until reload',
          description: 'Rename a space, then look at the sidebar: it shows the old name until the app reloads.',
        },
      ],
    },
  },
  {
    match: 'pin a channel to the top',
    result: { tasks: [{ kind: 'feature', title: 'Pin a channel to the top of the navigation tree' }] },
  },
  {
    match: 'CRDT merge benchmarks',
    result: { tasks: [{ kind: 'action', title: "Read Lena's CRDT benchmark write-up and reply" }] },
  },
];

const NOTHING: ProjectMailboxOperation.TriageResult = { tasks: [] };

/** The script's answer for a prompt quoting one message: the first entry it contains, else chatter. */
export const answer = (prompt: string): ProjectMailboxOperation.TriageResult =>
  SCRIPT.find((entry) => prompt.includes(entry.match))?.result ?? NOTHING;
