//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Blueprint, Routine } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import {
  AgentService as AgentServiceTag,
  type CreateSessionOptions,
  type GetSessionOptions,
  type RunRoutineOptions,
  RoutineError,
  type Session,
  getSession,
} from '@dxos/functions/AgentService';
import { ProcessManager } from '@dxos/functions-runtime';

import { type McpServerConfig, AiContextBinder } from '../conversation';
import { AgentProcess } from './agent-process';

// Re-export the full API from @dxos/functions for backward compatibility.
export {
  AgentService,
  type Service,
  type Session,
  type GetSessionOptions,
  type RunRoutineOptions,
  type CreateSessionOptions,
  RoutineError,
  getSession,
  runRoutine,
} from '@dxos/functions/AgentService';

export const createSession: (
  opts?: CreateSessionOptions,
) => Effect.Effect<
  Session,
  Blueprint.NotFoundError,
  Database.Service | Feed.FeedService | Blueprint.RegistryService | AgentServiceTag
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

  return yield* getSession(feed, { model: opts?.model });
}, Effect.scoped);

export const layer = (opts?: {
  systemPrompt?: string;
  /**
   * Default model used by sessions that don't specify one explicitly.
   */
  model?: GetSessionOptions['model'];

  /**
   * Provider for space-level MCP server configs.
   */
  getMcpServers?: () => McpServerConfig[];
}): Layer.Layer<AgentServiceTag, never, ProcessManager.Service> =>
  Layer.effect(
    AgentServiceTag,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.Service;
      const sessionCache = new Map<string, Session>();

      return {
        getSession: (feed: Feed.Feed, options?: GetSessionOptions) =>
          Effect.gen(function* () {
            const cached = sessionCache.get(feed.id);
            if (cached) {
              return cached;
            }

            const target = Obj.getDXN(feed).toString();
            const executable = AgentProcess({
              systemPrompt: opts?.systemPrompt,
              model: options?.model ?? opts?.model,
              getMcpServers: opts?.getMcpServers,
            });
            const processes = yield* processManager.list({ target, key: executable.key });

            let handle: ProcessManager.Handle<string, unknown>;
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

        runRoutine: (routineRef: Ref.Ref<Routine.Routine>, options?: RunRoutineOptions) =>
          Effect.gen(function* () {
            const routine = yield* Database.load(routineRef).pipe(
              Effect.mapError((err) => new RoutineError('Failed to load routine.', { description: String(err) })),
            );
            const routineDxn = Obj.getDXN(routine).toString();

            const feed = options?.feed ?? (yield* Database.add(Feed.make()));
            const feedDxn = Obj.getDXN(feed).toString();

            const handle = yield* processManager.spawn(
              AgentProcess({
                getMcpServers: opts?.getMcpServers,
                routineDxn,
                systemInstructions: options?.systemInstructions,
                model: options?.model,
              }),
              {
                name: 'routine',
                target: feedDxn,
                traceMeta: {
                  conversationId: feed.id,
                },
              },
            );

            const outputs = yield* handle.runAndExit({ inputs: [options?.input] }).pipe(
              Stream.runCollect,
              Effect.catchAllCause((cause) =>
                Effect.fail(new RoutineError('Routine process failed.', { description: Cause.pretty(cause) })),
              ),
            );
            const output = Chunk.head(outputs);

            if (Option.isNone(output)) {
              return yield* Effect.fail(new RoutineError('Routine process produced no output.'));
            }

            return output.value;
          }),
      };
    }),
  );

const makeSession = (process: ProcessManager.Handle<string, unknown>, feed: Feed.Feed): Session => ({
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
