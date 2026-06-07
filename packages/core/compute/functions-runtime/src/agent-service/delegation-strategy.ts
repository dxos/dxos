//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';

import { type Process } from '@dxos/compute';
import { type ProcessManager } from '@dxos/compute-runtime';
import { type Database, type Feed } from '@dxos/echo';

/**
 * A unit of work the supervisor delegates to a linked child process. `spawn` is an existential over
 * the child operation's input/output types: the strategy constructs it (e.g. via `Supervisor.delegate`)
 * so {@link AgentProcess} can remain agnostic to the operation type and just track the returned pid.
 */
export interface Delegation {
  /**
   * Stable id correlating this delegation with its completion (e.g. a plan task id).
   */
  readonly id: string;

  /**
   * Spawns the child for this delegation and returns its process id. Must be linked (non-blocking)
   * so the child's exit wakes the supervisor's `onChildEvent` — i.e. `Supervisor.delegate`.
   */
  readonly spawn: Effect.Effect<Process.ID, never, ProcessManager.ProcessOperationInvoker.Service>;
}

/**
 * Services the strategy callbacks may use. The hosting {@link AgentProcess} provides these.
 */
export type StrategyServices = Database.Service | Feed.FeedService;

/**
 * Turns a conversational agent process into a supervisor: after each turn it reconciles outstanding
 * work into linked child processes, and folds their results back into the conversation on completion.
 *
 * Implemented outside `@dxos/functions-runtime` (which cannot depend on the agent/plan types)
 * and passed to {@link AgentService.layer} so {@link AgentProcess} stays generic.
 * Absent by default — a plain conversational agent.
 */
// TODO(burdon): Merge with Agent?
export interface DelegationStrategy {
  /**
   * Called after each agent turn. Returns delegations for outstanding work not already in flight.
   * @param feed - The conversation feed (identifies which agent/plan to reconcile).
   * @param activeIds - Ids of delegations already running, so reconcile does not double-spawn.
   */
  readonly reconcile: (
    feed: Feed.Feed,
    activeIds: ReadonlySet<string>,
  ) => Effect.Effect<readonly Delegation[], never, StrategyServices>;

  /**
   * Called when a delegated child completes. Use to record the result and notify the user (e.g.
   * update the plan task status and append a message to the conversation feed).
   */
  readonly onComplete: (
    feed: Feed.Feed,
    id: string,
    exit: Exit.Exit<unknown>,
  ) => Effect.Effect<void, never, StrategyServices>;
}
