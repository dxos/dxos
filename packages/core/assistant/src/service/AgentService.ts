//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Database, Feed, type Obj } from '@dxos/echo';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Blueprint } from '@dxos/blueprints';
import { ProcessManager } from '@dxos/functions-runtime';
import { failedInvariant } from '@dxos/invariant';
import { makeAgentExecutable } from './agent-executable';

import { Ref } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { type Message } from '@dxos/types';

import { acquireReleaseResource } from '@dxos/effect';
import { AiContextBinder, ContextBinding } from '../conversation';

export interface Service {
  /**
   * Gets or createsa session context for a feed.
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
}

/**
 * Gets or creates a session context for a feed.
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
  Database.Service | QueueService | Blueprint.RegistryService | AgentService
> = Effect.fn('createSession')(function* (opts) {
  const blueprints = yield* Effect.forEach(opts?.blueprints ?? [], (blueprint) =>
    Blueprint.upsert(blueprint.key).pipe(Effect.map(Ref.make)),
  );

  const feed = yield* Database.add(Feed.make());
  const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(
    Feed.getQueueDxn(feed) ?? failedInvariant(),
  );
  const binder = yield* acquireReleaseResource(() => new AiContextBinder({ queue }));

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
      return {
        getSession: (feed: Feed.Feed) =>
          Effect.gen(function* () {
            const executable = makeAgentExecutable({ systemPrompt: opts?.systemPrompt });
            const processes = yield* processManager.list({ target: feed.id, executableKey: executable.key });
            if (processes.length > 0) {
              return makeSession(processes[0], feed);
            }

            const handle = yield* processManager.spawn(executable, {
              name: 'agent',
              target: feed.id,
            });
            return makeSession(handle, feed);
          }),
      };
    }),
  );

const makeSession = (process: ProcessManager.Handle<string, void>, feed: Feed.Feed): Session => ({
  feed,
  submitPrompt: (prompt: string) => process.submitInput(prompt),
  waitForCompletion: () => process.runToCompletion(),
});
