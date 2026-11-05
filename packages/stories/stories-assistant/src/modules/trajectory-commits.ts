//
// Copyright 2026 DXOS.org
//

import * as Trajectory from '@dxos/compute/Trajectory';
import { Feed } from '@dxos/echo';
import { type Commit } from '@dxos/react-ui-trace';

/** The branch name the graph shows the main thread on. */
export const MAIN = 'main';

/**
 * A conversation's trajectory as a git graph: one commit per event, on the feed branch the event was written on. A
 * commit's parent is the block before it on its branch (for a thread's opener, the fork point on its parent); a
 * thread's end also becomes a parent of the next commit on the branch it merges into.
 */
export const toCommits = (events: readonly Trajectory.Event[]): Commit[] => {
  const byBlock = new Map<string, string>();
  const branchOf = new Map<string, string>();
  const parentOf = new Map<string, string>();
  const lastOn = new Map<string, string>();
  const mergesInto = new Map<string, string[]>();
  let turns = 0;

  return events.map((event): Commit => {
    const thread = Trajectory.threadOf(event);
    const payload = event.payload;
    if (thread !== undefined && (payload._tag === 'turnBegin' || payload._tag === 'threadOpen')) {
      branchOf.set(thread, payload._tag === 'turnBegin' ? `turn ${++turns}` : (payload.purpose ?? payload.mode));
      parentOf.set(thread, payload.from?.thread === undefined ? MAIN : (branchOf.get(payload.from.thread) ?? MAIN));
    }
    const branch = thread === undefined ? MAIN : (branchOf.get(thread) ?? thread);

    const predecessor = Feed.getPredecessor(event);
    const before = (predecessor !== undefined ? byBlock.get(predecessor) : undefined) ?? lastOn.get(branch);
    const merged = mergesInto.get(branch) ?? [];
    mergesInto.delete(branch);
    const parents = [...(before !== undefined ? [before] : []), ...merged];

    const block = Feed.getBlockId(event);
    if (block !== undefined) {
      byBlock.set(block, event.id);
    }
    lastOn.set(branch, event.id);
    if (payload._tag === 'turnEnd' || payload._tag === 'threadMerge') {
      const target = parentOf.get(thread ?? '') ?? MAIN;
      mergesInto.set(target, [...(mergesInto.get(target) ?? []), event.id]);
    }

    return {
      id: event.id,
      timestamp: new Date(event.created),
      parents,
      branch,
      icon: iconOf(event),
      message: describe(event),
    };
  });
};

const iconOf = (event: Trajectory.Event): string => {
  switch (event.payload._tag) {
    case 'message':
      return event.sender.role === 'user'
        ? 'ph--user--regular'
        : event.sender.role === 'tool'
          ? 'ph--wrench--regular'
          : 'ph--robot--regular';
    case 'turnBegin':
    case 'threadOpen':
      return 'ph--git-branch--regular';
    case 'turnEnd':
    case 'threadMerge':
      return 'ph--git-merge--regular';
    case 'promptConsume':
      return 'ph--tray-arrow-down--regular';
    case 'threadWait':
      return 'ph--hourglass--regular';
    default:
      return 'ph--dot-outline--regular';
  }
};

const LENGTH = 60;

const describe = (event: Trajectory.Event): string => {
  const payload = event.payload;
  switch (payload._tag) {
    case 'message': {
      const text = payload.blocks
        .map((block) =>
          block._tag === 'text' ? block.text : block._tag === 'toolCall' ? `→ ${block.name}` : `[${block._tag}]`,
        )
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const who = event.sender.name ?? event.sender.role;
      return `${who}: ${text.length > LENGTH ? `${text.slice(0, LENGTH - 1)}…` : text}`;
    }
    case 'turnBegin':
      return 'turn begins';
    case 'turnEnd':
      return `turn ends (${payload.finishReason})`;
    case 'threadOpen':
      return `${payload.mode} thread opens${payload.purpose ? `: ${payload.purpose}` : ''}`;
    case 'threadMerge':
      return `thread merges (${payload.mode})`;
    case 'threadWait':
      return 'waits for another thread';
    case 'promptConsume':
      return 'takes the prompt';
    default:
      return payload._tag;
  }
};
