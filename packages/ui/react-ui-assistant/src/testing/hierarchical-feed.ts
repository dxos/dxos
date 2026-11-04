//
// Copyright 2026 DXOS.org
//

import { Message } from '@dxos/types';

import { type ForkMarker, type ThreadLane, laneTag } from '../types.ts';

export type HierarchicalFeed = {
  readonly messages: readonly Message.Message[];
  /** The lane of each message shown in full, by message id. */
  readonly lanes: ReadonlyMap<string, ThreadLane>;
  /** The forks that start at each message, by message id. */
  readonly forks: ReadonlyMap<string, readonly ForkMarker[]>;
};

// Recent, since a lane's header shows how long it has been running.
const LANE_AGE = 4 * 60_000;

const prompt = (text: string) =>
  Message.make({ sender: { role: 'user', name: 'Rich' }, blocks: [{ _tag: 'text', text }] });

const answer = (text: string, name?: string) =>
  Message.make({ sender: { role: 'assistant', name }, blocks: [{ _tag: 'text', text }] });

/**
 * A main thread with what branches off it: two forks, three lanes in full (done, waiting on another lane, and run by
 * another agent) and one lane working in the background, which the thread shows as a card.
 */
export const createHierarchicalFeed = (): HierarchicalFeed => {
  const started = new Date(Date.now() - LANE_AGE).toISOString();

  const opening = [
    prompt('Plan the beta launch.'),
    answer('The launch depends on three things: the announcement, the API freeze and the pricing page.'),
  ];

  const announcement = [
    prompt('Draft the announcement.'),
    answer('Here is a first draft: the beta opens on Friday, and every current user is invited.'),
  ];
  const freeze = [
    prompt('Check that the API freeze holds.'),
    answer('Two changes are still open. I will finish this check once the pricing review has named its endpoints.'),
  ];
  const pricing = [
    prompt('Review the pricing page.'),
    answer('The page matches the plan so far. I am now comparing its limits with the API.', 'Reviewer'),
  ];

  const signups: ThreadLane = {
    id: 'signups',
    hue: 'fuchsia',
    title: 'Collect beta sign-ups',
    status: 'running',
    started,
  };
  const card = answer(
    laneTag({
      lane: signups,
      lines: [
        { role: 'user', name: 'Rich', text: 'Collect the beta sign-ups from the form.' },
        { role: 'assistant', text: 'I have read 120 of about 300 responses.' },
      ],
    }),
  );

  const closing = [
    prompt('Where does that leave the launch?'),
    answer('Friday still holds if the pricing review finishes today. The announcement is ready to send.'),
  ];

  const lanes = new Map<string, ThreadLane>();
  const addLane = (messages: readonly Message.Message[], lane: Omit<ThreadLane, 'first' | 'started'>) => {
    for (const { id } of messages) {
      lanes.set(id, { ...lane, started, first: messages[0].id });
    }
  };
  addLane(announcement, { id: 'announcement', hue: 'sky', title: 'Draft the announcement', status: 'done' });
  addLane(freeze, {
    id: 'freeze',
    hue: 'amber',
    title: 'Check the API freeze',
    status: 'waiting',
    waitingOn: { hue: 'emerald', title: 'Review the pricing page' },
  });
  addLane(pricing, {
    id: 'pricing',
    hue: 'emerald',
    title: 'Review the pricing page',
    owner: 'Reviewer',
    status: 'running',
  });

  const forks = new Map<string, readonly ForkMarker[]>([
    [opening[1].id, [{ id: 'fork-thursday', label: 'Launch on Thursday' }]],
    [announcement[1].id, [{ id: 'fork-shorter', label: 'A shorter announcement' }]],
  ]);

  return { messages: [...opening, ...announcement, ...freeze, ...pricing, card, ...closing], lanes, forks };
};
