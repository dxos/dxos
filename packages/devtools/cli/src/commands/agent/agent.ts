//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { AiService, Model, OpaqueToolkit } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppSpace } from '@dxos/app-toolkit';
import { CommandConfig, Common, withTypes } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import {
  type AiChatServices,
  HARNESS_SKILL_KEY,
  Provider,
  chatLayer,
  createLogBuffer,
  getReloadRequest,
  operationHandlers,
  toolkits,
  types,
} from '../../util';
import { runNonInteractive } from '../chat/non-interactive';
import { ChatProcessor } from '../chat/processor';

/**
 * Non-interactive agent bridge for the hypervisor (see the agent-harness skill, Aspect A). Runs the
 * Composer agent loop to completion on a single prompt and exits, printing a continuation hint. The
 * harness self-develop skill (file/shell/reload tools) is enabled by default so the agent can extend
 * itself; the hypervisor supervises via exit codes:
 *
 * - `0`   turn complete / idle.
 * - `75`  wants-reload: the agent called `request_reload` after editing code (see bin.ts teardown).
 * - other crash / runtime error.
 */
export const agent = Command.make(
  'agent',
  {
    // Positional, not `-p`: the global `dx -p/--profile` option owns `-p`, so an agent `-p` alias
    // would be swallowed as the profile name. `dx agent "<goal>"` is unambiguous.
    prompt: Args.text({ name: 'prompt' }).pipe(
      Args.withDescription('Goal or next instruction for the agent. Runs the loop to completion and exits.'),
    ),
    spaceId: Common.spaceId.pipe(Options.optional),
    provider: Options.choice('provider', Provider.literals).pipe(
      Options.withDescription('AI provider to use.'),
      Options.withDefault('edge'),
    ),
    model: Options.text('model').pipe(
      Options.withDescription('Model to use.'),
      Options.withAlias('m'),
      Options.withSchema(DXN.Schema),
      Options.optional,
    ),
    skills: Options.text('skill').pipe(
      Options.withDescription('Additional skills to include (the harness self-develop skill is always on).'),
      Options.withAlias('b'),
      Options.repeated,
    ),
    noSelfDevelop: Options.boolean('noSelfDevelop', { ifPresent: true }).pipe(
      Options.withDescription('Disable the harness self-develop skill (no file/shell/reload tools).'),
    ),
  },
  (options) =>
    Effect.gen(function* () {
      const { logLevel, json } = yield* CommandConfig;

      const logBuffer = createLogBuffer();
      log.config({ filter: logLevel });
      if (!process.env.DX_AGENT_LOG_STDERR) {
        log.runtimeConfig.processors = [logBuffer.processor];
      }

      const client = yield* ClientService;
      const runtime = yield* Effect.runtime<AiChatServices>();
      const service = yield* AiService.AiService;

      const model = Option.getOrElse(options.model, () =>
        Match.value(options.provider).pipe(
          Match.when('lmstudio', () => Model.DEFAULT_LMSTUDIO),
          Match.when('ollama', () => Model.DEFAULT_OLLAMA),
          Match.orElse(() => Model.DEFAULT_EDGE),
        ),
      );

      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const toolkit = OpaqueToolkit.merge(...toolkits);
      const processor = new ChatProcessor({
        runtime,
        toolkit,
        functions: operationHandlers,
        metadata: service.metadata,
        registry,
      });

      // Spaces load asynchronously after the client opens; wait for them before resolving the
      // personal space so a fast turn does not race ahead of loading.
      yield* Effect.promise(async () => {
        for (let attempt = 0; attempt < 100 && client.spaces.get().length === 0; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      });
      const space = AppSpace.getPersonalSpace(client) ?? client.spaces.get()[0];
      if (!space) {
        yield* Console.error('No space available. Run `dx halo create` first.');
        return;
      }
      yield* Effect.promise(() => space.waitUntilReady());

      const skills = [...(options.noSelfDevelop ? [] : [HARNESS_SKILL_KEY]), ...options.skills];

      yield* Effect.promise(async () => {
        await runNonInteractive({ space, processor, skills, prompt: options.prompt, model, json });
      });

      // Continuation hint for the hypervisor (session reattach via `--continue` is a follow-up; the
      // agent's own journal file carries context across restarts today).
      const reload = getReloadRequest();
      if (reload) {
        yield* Console.log(`» reload requested: ${reload}`);
        yield* Console.log('» the hypervisor should rebuild the edited package, health-check, and continue.');
      }
      yield* Console.log(`» continue: dx agent "<next instruction>"`);
    }),
).pipe(
  Command.withDescription('Run the Composer agent non-interactively on a single prompt (harness bridge).'),
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId, functions: operationHandlers })),
  Command.provideEffectDiscard(() => withTypes(...types)),
);
