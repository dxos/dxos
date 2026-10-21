//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Queue from 'effect/Queue';

import { log } from '@dxos/log';
import { type Trajectory } from '@dxos/trajectory';
import { type Message } from '@dxos/types';

/** Light threads that run at once by default, besides the turn on main. */
export const DEFAULT_THREAD_LIMIT = 3;

/** How often the scheduler re-reads the queue while lanes run, for a prompt whose wake it missed. */
const POLL_MS = 1_000;

/** How often, and for how long, the scheduler waits for a just-started lane to take up its prompt. */
const START_POLL_MS = 25;
const START_TIMEOUT_MS = 10_000;

export type ThreadingOptions = {
  /** Light threads that run at once, besides the turn on main. */
  readonly limit?: number;
};

/**
 * What the scheduler needs from the agent process.
 */
export type LaneRunner<R> = {
  /** Prompts waiting for a turn, oldest first. */
  readonly pending: Effect.Effect<readonly Message.Message[], never, R>;
  /** Runs one turn answering `message`, in `thread` when set (on main otherwise), and acks the message. */
  readonly run: (message: Message.Message, thread: Trajectory.EventId | undefined) => Effect.Effect<void, never, R>;
  /** Opens a light thread for `message`. */
  readonly open: (message: Message.Message) => Effect.Effect<Trajectory.EventId, never, R>;
  /** Joins a light thread whose work is done to main. */
  readonly merge: (thread: Trajectory.EventId) => Effect.Effect<void, never, R>;
  /** The light thread of a turn that answered `message` and died mid-way, so its redelivery runs there again. */
  readonly interrupted: (message: Message.Message) => Effect.Effect<Trajectory.EventId | undefined, never, R>;
  /** Whether the turn answering `message` has begun and taken it up, so a light thread opened now sees it. */
  readonly started: (message: Message.Message) => Effect.Effect<boolean, never, R>;
};

type Finished = { readonly id: string; readonly thread?: Trajectory.EventId; readonly exit: Exit.Exit<void> };

/**
 * Runs queued prompts in parallel lanes until the queue is drained and every lane has ended: the first prompt runs on
 * main, and a prompt that arrives while lanes run opens a light thread, up to `limit` of them; the rest wait in order.
 * A light thread merges into main as soon as its turn ends. `wake` signals a new prompt; a lane that fails fails the
 * run once the others have ended.
 */
export const runLanes = <R>(
  runner: LaneRunner<R>,
  { limit = DEFAULT_THREAD_LIMIT, wake }: ThreadingOptions & { wake: Queue.Dequeue<void> },
): Effect.Effect<void, never, R> =>
  Effect.gen(function* () {
    const finished = yield* Queue.unbounded<Finished>();
    const running = new Map<string, Trajectory.EventId | undefined>();
    // Prompts of running lanes whose turn is known to have begun.
    const begun = new Set<string>();
    const pendingById = new Map<string, Message.Message>();

    // A light thread snapshots the lanes running when it opens, so a lane started a moment ago (a burst of queued
    // prompts) must have begun its turn first, or the new thread would not see it at all.
    const awaitStarted = Effect.gen(function* () {
      const waiting = () => [...running.keys()].filter((id) => !begun.has(id));
      const check: Effect.Effect<boolean, never, R> = Effect.gen(function* () {
        for (const id of waiting()) {
          const message = pendingById.get(id);
          if (message === undefined || (yield* runner.started(message))) {
            begun.add(id);
          }
        }
        return waiting().length === 0;
      });
      const loop: Effect.Effect<void, never, R> = Effect.flatMap(check, (done) =>
        done ? Effect.void : Effect.flatMap(Effect.sleep(START_POLL_MS), () => loop),
      );
      yield* loop.pipe(Effect.timeoutOption(START_TIMEOUT_MS));
    });
    // Handled in this run: the queue read is eventually consistent, so an acked prompt can still read as pending.
    const handled = new Set<string>();
    let failure: Cause.Cause<never> | undefined;

    const start = (message: Message.Message, thread: Trajectory.EventId | undefined) =>
      Effect.gen(function* () {
        running.set(message.id, thread);
        pendingById.set(message.id, message);
        handled.add(message.id);
        log('lane start', { message: message.id, thread, running: running.size });
        yield* runner.run(message, thread).pipe(
          Effect.exit,
          Effect.flatMap((exit) => Queue.offer(finished, { id: message.id, thread, exit })),
          Effect.forkChild,
        );
      });

    const settle = ({ id, thread, exit }: Finished) =>
      Effect.gen(function* () {
        running.delete(id);
        begun.delete(id);
        pendingById.delete(id);
        log('lane end', { message: id, thread, success: Exit.isSuccess(exit) });
        if (thread !== undefined) {
          yield* runner.merge(thread);
        }
        if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
          failure ??= Cause.die(Cause.squash(exit.cause));
        }
      });

    while (true) {
      if (failure === undefined) {
        const queue = (yield* runner.pending).filter((message) => !handled.has(message.id));
        for (const message of queue) {
          const resumed = yield* runner.interrupted(message);
          const lights = [...running.values()].filter((thread) => thread !== undefined).length;
          if (resumed !== undefined) {
            yield* start(message, resumed);
          } else if (running.size === 0) {
            yield* start(message, undefined);
          } else if (lights < limit) {
            yield* awaitStarted;
            yield* start(message, yield* runner.open(message));
          } else {
            break;
          }
        }
      }

      if (running.size === 0) {
        break;
      }

      const next = yield* Effect.raceFirst(
        Queue.take(finished).pipe(Effect.map((done) => [done])),
        Effect.raceFirst(Queue.take(wake), Effect.sleep(POLL_MS)).pipe(Effect.as([])),
      );
      for (const done of [...next, ...(yield* Queue.clear(finished))]) {
        yield* settle(done);
      }
    }

    if (failure !== undefined) {
      return yield* Effect.failCause(failure);
    }
  });
