//
// Copyright 2026 DXOS.org
//

//
// The Agents slide: what reaches an agent, what it delegates, and the one space all of it lands in — left to right,
// with every card showing the feed it writes.
//

import { type SlideSpec } from './spec.ts';
import { type StudioModel, studioComponentData } from './studio.ts';

/** A feed card: a title, what it is, and the strip of blocks its feed holds. */
const feed = (
  id: string,
  label: string,
  icon: string,
  footer: string,
  blocks: number,
  marks: readonly number[],
  rest: { body?: string; feedLabel?: string; tone?: string } = {},
) => ({
  id,
  label,
  icon,
  footer,
  kind: 'feed-card',
  feed: { blocks, marks, ...(rest.feedLabel ? { label: rest.feedLabel } : {}) },
  ...(rest.body ? { body: rest.body } : {}),
  ...(rest.tone ? { tone: rest.tone } : {}),
});

const DELEGATES = 'Delegates tasks; each opens a child feed.';

export const agentsSpec = (model: StudioModel): SlideSpec => ({
  id: 'agents',
  title: 'Agents',
  metrics: { cardWidth: 304, bodyCardHeight: 176, cardHeight: 136, rowGap: 32, columnGap: 96, groupGap: 96 },
  groups: [
    {
      id: 'inbound',
      columns: [
        [
          feed('email', 'Email', 'envelope', 'plugin-inbox · JMAP', 9, [8]),
          feed('discord', 'Discord', 'discord-logo', 'plugin-discord', 9, [8]),
          feed('chat', 'Chat', 'chat-circle-dots', 'plugin-thread', 9, [8]),
        ],
      ],
    },
    {
      id: 'agents',
      columns: [
        [
          feed('triage', 'Triage agent', 'robot', 'Agent DO · ProcessObject', 9, [5, 6], {
            body: DELEGATES,
            feedLabel: 'feed',
            tone: 'ink',
          }),
          feed('planner', 'Planner agent', 'robot', 'Agent DO · ProcessObject', 9, [4, 5], {
            body: DELEGATES,
            feedLabel: 'feed',
            tone: 'ink',
          }),
        ],
      ],
    },
    {
      id: 'subagents',
      box: true,
      columns: [
        [
          feed('research', 'Research', 'magnifying-glass', 'parent: triage agent', 6, [0], { feedLabel: 'task' }),
          feed('reply', 'Draft reply', 'pencil-simple-line', 'parent: triage agent', 6, [0], { feedLabel: 'task' }),
          feed('calendar', 'Calendar', 'calendar-blank', 'parent: planner agent', 6, [0], { feedLabel: 'task' }),
          feed('travel', 'Travel', 'airplane-tilt', 'parent: planner agent', 6, [0], { feedLabel: 'task' }),
        ],
      ],
    },
    {
      id: 'space',
      box: true,
      columns: [[{ id: 'space', component: 'space-graph', ...studioComponentData(model, 'space') }]],
    },
  ],
  edges: [
    { from: 'email', to: 'triage' },
    { from: 'discord', to: 'triage' },
    { from: 'chat', to: 'planner' },
    { from: 'triage', to: 'research' },
    { from: 'triage', to: 'reply' },
    { from: 'planner', to: 'calendar' },
    { from: 'planner', to: 'travel' },
    { from: 'research', to: 'space' },
    { from: 'reply', to: 'space' },
    { from: 'calendar', to: 'space' },
    { from: 'travel', to: 'space' },
  ],
  note: 'Feeds are append-only. A delegation is a block in the parent’s feed that opens a child feed, so every sub-agent’s work is attributable and replayable.',
});
