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

const ThreadToolkit = Toolkit.make(
  Tool.make(THREAD_WAIT, {
    description:
      'Waits until another thread of this conversation has finished, then returns what it did. Call it only when ' +
      'your request depends on a result that thread has not produced yet; otherwise answer on your own.',
    parameters: Schema.Struct({
      thread: Schema.String.annotate({ description: 'Id of the thread to wait for, from its <thread id="…"> tag.' }),
    }),
    success: Schema.String,
  }),
);

/**
 * The tools a turn in a light thread has for the threads beside it: waiting for one to finish.
 */
export const make = (feed: Feed.Feed, turn: Trajectory.EventId, db: Database.Database): OpaqueToolkit.OpaqueToolkit =>
  OpaqueToolkit.make(
    ThreadToolkit,
    ThreadToolkit.toLayer({
      [THREAD_WAIT]: ({ thread }) =>
        TrajectoryStore.waitForThread(feed, { turn, on: thread }).pipe(Effect.provideService(Database.Service, { db })),
    }),
  );
