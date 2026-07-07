//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { messageSource } from './facts';
import { deriveThreadId } from './threading';
import { Thread, type ThreadState } from './types';

const DEFAULT_STALE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export type BuildThreadsOptions = {
  readonly ownerEmail: string;
  readonly now: string;
  readonly stalePeriodMs?: number;
};

// Coarse thread state from who spoke last and how long ago. `resolved` needs a signal we do not yet
// extract, so it is not inferred in this slice.
const computeState = (lastFromOwner: boolean, lastCreated: string, options: BuildThreadsOptions): ThreadState => {
  const idleMs = new Date(options.now).getTime() - new Date(lastCreated).getTime();
  const stale = idleMs > (options.stalePeriodMs ?? DEFAULT_STALE_PERIOD_MS);
  if (stale) {
    return 'stalled';
  }
  return lastFromOwner ? 'awaiting-theirs' : 'awaiting-mine';
};

// Group messages into canonical Thread objects. Messages are bucketed by derived threadId; within a
// bucket they are ordered by `created` to find the last speaker.
export const buildThreads = (messages: readonly Message.Message[], options: BuildThreadsOptions): Thread[] => {
  const buckets = new Map<string, Message.Message[]>();
  for (const message of messages) {
    const threadId = deriveThreadId(message);
    let bucket = buckets.get(threadId);
    if (!bucket) {
      bucket = [];
      buckets.set(threadId, bucket);
    }
    bucket.push(message);
  }

  const threads: Thread[] = [];
  for (const [threadId, bucket] of buckets) {
    const ordered = [...bucket].sort((a, b) => a.created.localeCompare(b.created));
    const last = ordered[ordered.length - 1];
    // Email addresses are case-insensitive, so compare and dedup on a lowercased form; otherwise
    // mixed-case senders split into distinct participants and can misclassify awaiting-mine/theirs.
    const owner = options.ownerEmail.toLowerCase();
    const lastFromOwner = last.sender.email?.toLowerCase() === owner;
    const participants = [...new Set(ordered.flatMap((m) => (m.sender.email ? [m.sender.email.toLowerCase()] : [])))];
    const summaries = ordered.flatMap((m) =>
      typeof m.properties?.summary === 'string' && m.properties.summary.length > 0 ? [m.properties.summary] : [],
    );
    const subject = typeof ordered[0].properties?.subject === 'string' ? ordered[0].properties.subject : threadId;

    threads.push(
      Obj.make(Thread, {
        threadId,
        subject,
        summary: summaries.length > 0 ? summaries.join('\n') : subject,
        state: computeState(lastFromOwner, last.created, options),
        participants,
        messageIds: ordered.map(messageSource),
        openQuestions: [],
        actionItems: [],
      }),
    );
  }
  return threads;
};
