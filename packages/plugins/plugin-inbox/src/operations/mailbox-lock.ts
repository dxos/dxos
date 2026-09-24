//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Semaphore from 'effect/Semaphore';

import { Obj } from '@dxos/echo';

import type * as Mailbox from '../types/Mailbox.ts';

/**
 * One mutex per mailbox URI, created on first use and never evicted — a mailbox is a long-lived
 * object and the entry is a few bytes.
 */
const locks = new Map<string, Semaphore.Semaphore>();

/**
 * Serializes a pipeline body against other runs over the same mailbox.
 *
 * Pipelines that APPEND (summaries, annotations) are only idempotent when their read of what already
 * exists cannot interleave with another run's write: two concurrent runs would each see a message as
 * unsummarized and each append a summary for it, and — worse — each provision an annotation feed,
 * leaving whichever assignment landed last as the only one reachable from the mailbox.
 *
 * In-process only, which covers what actually races today: a routine firing while the user presses
 * the toolbar button, both in the same client runtime. Cross-runtime serialization needs a durable
 * lease at the operation layer, which the repo has no primitive for yet.
 */
export const withMailboxLock = <A, E, R>(
  mailbox: Mailbox.Mailbox,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => {
  const key = Obj.getURI(mailbox);
  let lock = locks.get(key);
  if (!lock) {
    lock = Semaphore.makeUnsafe(1);
    locks.set(key, lock);
  }
  return lock.withPermits(1)(effect);
};
