//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Stream from 'effect/Stream';

import type { Database, Feed, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import type { ContentBlock } from '@dxos/types';

import type * as Trace from './Trace';

/**
 * Service interface for the agent session manager.
 * Implementation lives in @dxos/functions-runtime.
 */
export interface Service {
  /**
   * Gets or creates a session for a feed.
   */
  getSession: (feed: Feed.Feed, options?: GetSessionOptions) => Effect.Effect<Session>;

  /**
   * Hydrates agent processes persisted by a previous session.
   * Each record is rehydrated with a fresh process built from the layer options.
   */
  hydrate: () => Effect.Effect<void>;
}

export class AgentService extends Context.Tag('@dxos/functions-runtime/AgentService')<AgentService, Service>() {}

/**
 * Handle to an agent session.
 */
export interface Session {
  /**
   * The feed that the session is associated with.
   */
  readonly feed: Feed.Feed;

  /**
   * Gets the context objects from the agent.
   */
  getContext: () => Effect.Effect<Ref.Ref<Obj.Unknown>[], never, Database.Service>;

  /**
   * Adds context objects to the agent.
   */
  addContext: (context: Ref.Ref<Obj.Unknown>[]) => Effect.Effect<void, never, Database.Service>;

  /**
   * Submit a turn: a plain user prompt, or pre-built content blocks (e.g. synthetic context + prompt).
   */
  submitPrompt: (prompt: string | ContentBlock.Any[]) => Effect.Effect<void>;

  /**
   * Wait until agent has completed its work.
   */
  waitForCompletion: () => Effect.Effect<void>;

  /**
   * Terminates the agent process and clears its durable storage.
   */
  terminate: () => Effect.Effect<void>;

  /**
   * Subscribe to ephemeral trace events (e.g., streaming partial messages).
   * Replays buffered events, then streams new ones until the process ends.
   *
   * When forking a collector from a short-lived parent (e.g. `useEffect` +
   * `runPromise(Effect.forEach(subscribe))`), use {@link Effect.forkDaemon} so the
   * stream survives after the parent scope closes; interrupt it on dispose.
   */
  subscribeEphemeral: () => Stream.Stream<Trace.Message>;
}

export const getSession = Effect.serviceFunctionEffect(AgentService, (service) => service.getSession);

export const hydrate = Effect.serviceFunctionEffect(AgentService, (service) => service.hydrate);

export interface GetSessionOptions {
  readonly model?: DXN.DXN;
  // The catalog's shared model ids are served by several providers, so the provider must accompany
  // the model into the agent process — the id alone does not identify a resolver.
  readonly provider?: DXN.DXN;
  readonly systemPrompt?: string;
}
