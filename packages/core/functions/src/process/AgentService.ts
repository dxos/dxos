//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type ModelName } from '@dxos/ai';
import { Blueprint, Routine } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';

import { RoutineError } from './RoutineError';
import * as Trace from '../Trace';

export { RoutineError };

export interface Service {
  /**
   * Gets or creates a session for a feed.
   */
  getSession: (feed: Feed.Feed, options?: GetSessionOptions) => Effect.Effect<Session>;

  /**
   * Runs a routine to completion and returns the output.
   * Spawns a short-lived process that terminates after the routine completes.
   */
  runRoutine: (
    routineRef: Ref.Ref<Routine.Routine>,
    options?: RunRoutineOptions,
  ) => Effect.Effect<unknown, RoutineError, Database.Service | Feed.FeedService>;
}

export class AgentService extends Context.Tag('@dxos/functions/AgentService')<AgentService, Service>() {}

/**
 * Handle to an agent session.
 */
export interface Session {
  /**
   * The feed that the session is associated with.
   */
  readonly feed: Feed.Feed;

  /**
   * Submits a prompt to the agent.
   */
  submitPrompt: (prompt: string) => Effect.Effect<void>;

  /**
   * Wait until agent has completed its work.
   */
  waitForCompletion: () => Effect.Effect<void>;

  /**
   * Subscribe to ephemeral trace events (e.g., streaming partial messages).
   * Replays buffered events, then streams new ones until the process ends.
   */
  subscribeEphemeral: () => Stream.Stream<Trace.Message>;

  /**
   * Adds context objects to the agent.
   */
  addContext: (context: Ref.Ref<Obj.Unknown>[]) => Effect.Effect<void, never, Feed.FeedService>;

  /**
   * Gets the context objects from the agent.
   */
  getContext: () => Effect.Effect<Ref.Ref<Obj.Unknown>[], never, Feed.FeedService>;
}

/**
 * Gets or creates a session for a feed.
 */
export const getSession = Effect.serviceFunctionEffect(AgentService, (service) => service.getSession);

/**
 * Runs a routine to completion and returns the output.
 */
export const runRoutine = Effect.serviceFunctionEffect(AgentService, (service) => service.runRoutine);

export interface GetSessionOptions {
  readonly model?: ModelName;
}

export interface RunRoutineOptions {
  readonly input?: unknown;
  readonly systemInstructions?: string;
  readonly model?: ModelName;
  /**
   * Use an existing feed for conversation context.
   * When not provided, a new feed is created for the routine execution.
   */
  readonly feed?: Feed.Feed;
}

export interface CreateSessionOptions {
  readonly blueprints?: Blueprint.Blueprint[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
  readonly model?: ModelName;
}
