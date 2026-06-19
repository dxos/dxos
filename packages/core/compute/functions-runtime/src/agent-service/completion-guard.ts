//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { type Database, type Feed } from '@dxos/echo';

/**
 * Optional hook for {@link AgentProcess} to inspect agent-attached state before calling `ctx.succeed()`.
 * Implemented outside `@dxos/functions-runtime` (which cannot depend on agent/plan ECHO types).
 */
export interface CompletionGuard {
  /**
   * When the agent has a plan with outstanding work, returns a markdown summary for an ephemeral
   * stop/continue check. Returns `undefined` when completion can proceed without the check.
   */
  readonly getIncompletePlanSummary: (
    feed: Feed.Feed,
  ) => Effect.Effect<string | undefined, never, Database.Service>;
}
