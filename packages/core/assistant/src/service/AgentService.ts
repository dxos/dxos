//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import { Feed } from '@dxos/echo';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ProcessManager } from '@dxos/functions-runtime';
import { makeAgentExecutable } from './agent-executable';

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
   * Submits a prompt to the agent.
   */
  submitPrompt: (prompt: string) => Effect.Effect<void>;
}

/**
 * Gets or creates a session context for a feed.
 */
export const getSession = Effect.serviceFunctionEffect(AgentService, (service) => service.getSession);

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
              return makeSession(processes[0]);
            }

            const handle = yield* processManager.spawn(executable, {
              name: 'agent',
              target: feed.id,
            });
            return makeSession(handle);
          }),
      };
    }),
  );

const makeSession = (process: ProcessManager.Handle<string, void>) => ({
  submitPrompt: (prompt: string) => process.submitInput(prompt),
});
