//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Database, Feed, Obj } from '@dxos/echo';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Blueprint } from '@dxos/blueprints';
import { ProcessManager } from '@dxos/functions-runtime';
import { AgentProcess } from './agent-process';

import { Ref } from '@dxos/echo';
import { type Trace } from '@dxos/functions';

import { acquireReleaseResource } from '@dxos/effect';
import { AiContextBinder } from '../conversation';

export interface Service {
  /**
   * Gets or creates a session for a feed.
   */
  getSession: (feed: Feed.Feed) => Effect.Effect<Session>;
}

export class AgentService extends Context.Tag('@dxos/assistant/AgentService')<AgentService, Service>() {}

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
   * Subscribe to ephemeral trace events (e.g. streaming partial messages).
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

export interface CreateSessionOptions {
  readonly blueprints?: Blueprint.Blueprint[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
}

export const createSession: (
  opts?: CreateSessionOptions,
) => Effect.Effect<
  Session,
  Blueprint.NotFoundError,
  Database.Service | Feed.FeedService | Blueprint.RegistryService | AgentService
> = Effect.fn('createSession')(function* (opts) {
  const blueprints = yield* Effect.forEach(opts?.blueprints ?? [], (blueprint) =>
    Blueprint.upsert(blueprint.key).pipe(Effect.map(Ref.make)),
  );

  const feed = yield* Database.add(Feed.make());
  const runtime = yield* Effect.runtime<Feed.FeedService>();
  const binder = yield* acquireReleaseResource(() => new AiContextBinder({ feed, runtime }));

  yield* Effect.promise(() =>
    binder.bind({
      blueprints,
      objects: opts?.context ?? [],
    }),
  );

  return yield* getSession(feed);
}, Effect.scoped);

export const layer = (opts?: {
  systemPrompt?: string;
}): Layer.Layer<AgentService, never, ProcessManager.ProcessManagerService> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.ProcessManagerService;
      const sessionCache = new Map<string, Session>();

      return {
        getSession: (feed: Feed.Feed) =>
          Effect.gen(function* () {
            const cached = sessionCache.get(feed.id);
            if (cached) {
              return cached;
            }

            const target = Obj.getDXN(feed).toString();
            const executable = AgentProcess({ systemPrompt: opts?.systemPrompt });
            const processes = yield* processManager.list({ target, key: executable.key });

            let handle: ProcessManager.Handle<string, void>;
            if (processes.length > 0) {
              handle = processes[0];
            } else {
              handle = yield* processManager.spawn(executable, {
                name: 'agent',
                target,
                traceMeta: {
                  conversationId: feed.id,
                },
              });
            }

            const session = makeSession(handle, feed);
            sessionCache.set(feed.id, session);
            return session;
          }),
      };
    }),
  );

const makeSession = (process: ProcessManager.Handle<string, void>, feed: Feed.Feed): Session => ({
  feed,
  submitPrompt: (prompt: string) => process.submitInput(prompt),
  waitForCompletion: () => process.runToCompletion(),
  subscribeEphemeral: () => process.subscribeEphemeral(),
  addContext: (context: Ref.Ref<Obj.Unknown>[]) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const binder = yield* acquireReleaseResource(() => new AiContextBinder({ feed, runtime }));
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: context,
        }),
      );
    }).pipe(Effect.scoped),
  getContext: () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const binder = yield* acquireReleaseResource(() => new AiContextBinder({ feed, runtime }));
      return binder.getObjects().map((object) => Ref.make(object));
    }).pipe(Effect.scoped),
});
