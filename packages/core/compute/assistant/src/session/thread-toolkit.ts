//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import { Database, type Feed } from '@dxos/echo';
import { type Trajectory } from '@dxos/trajectory';

import * as TrajectoryStore from './TrajectoryStore.ts';

export const THREAD_WAIT = 'thread_wait';
export const THREAD_DELEGATE = 'thread_delegate';

const ThreadWait = Tool.make(THREAD_WAIT, {
  description:
    'Waits until another thread of this conversation has finished, then returns what it did. Call it only when ' +
    'your request depends on a result that thread has not produced yet; otherwise answer on your own.',
  parameters: Schema.Struct({
    thread: Schema.String.annotate({ description: 'Id of the thread to wait for, from its <thread id="…"> tag.' }),
  }),
  success: Schema.String,
});

const ThreadDelegate = Tool.make(THREAD_DELEGATE, {
  description:
    'Delegates a self-contained task to a subagent that runs in a background thread, in parallel with you, and ' +
    'returns its thread id at once. The subagent starts with nothing but the task, so state everything it needs. ' +
    `Call ${THREAD_WAIT} with the id when you need its answer; when it finishes, its answer also joins the conversation.`,
  parameters: Schema.Struct({
    task: Schema.String.annotate({ description: 'The complete instructions for the subagent.' }),
    purpose: Schema.String.annotate({ description: 'A short title for the task, shown to the reader.' }),
  }),
  success: Schema.String,
});

const WaitToolkit = Toolkit.make(ThreadWait);
const DelegateToolkit = Toolkit.make(ThreadWait, ThreadDelegate);

export type ThreadToolkitOptions = {
  /** Whether the turn may delegate to subagents; a subagent's own turns may not, so delegation never nests. */
  readonly delegate?: boolean;
};

/**
 * The tools a turn has for the threads beside it: waiting for one to finish, and, when it may delegate, starting a
 * subagent in a thread of its own.
 */
export const make = (
  feed: Feed.Feed,
  turn: Trajectory.EventId,
  db: Database.Database,
  { delegate = false }: ThreadToolkitOptions = {},
): OpaqueToolkit.OpaqueToolkit => {
  const wait = ({ thread }: { thread: string }) =>
    TrajectoryStore.waitForThread(feed, { turn, on: thread }).pipe(Effect.provideService(Database.Service, { db }));
  if (!delegate) {
    return OpaqueToolkit.make(WaitToolkit, WaitToolkit.toLayer({ [THREAD_WAIT]: wait }));
  }
  return OpaqueToolkit.make(
    DelegateToolkit,
    DelegateToolkit.toLayer({
      [THREAD_WAIT]: wait,
      [THREAD_DELEGATE]: ({ task, purpose }) =>
        TrajectoryStore.delegate(feed, { task, purpose }).pipe(
          Effect.map(
            (thread) =>
              `Started subagent thread ${thread} ("${purpose}"). It runs in the background; call ${THREAD_WAIT} ` +
              `with thread "${thread}" when you need its answer.`,
          ),
          Effect.provideService(Database.Service, { db }),
        ),
    }),
  );
};
