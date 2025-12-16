//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { createSignal } from 'solid-js';

import { AiService, DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL, ModelName } from '@dxos/ai';
import { type AiConversation, GenericToolkit } from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type AiChatServices, Provider, chatLayer, createLogBuffer, renderApp, withTypes } from '../../util';
import { Common } from '../options';

import { functions, toolkits, types } from './blueprints';
import { Chat } from './components';
import { ChatProcessor } from './processor';
import { typeRegistry } from './types';

export const chat = Command.make(
  'chat',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    debug: Options.boolean('debug', { ifPresent: true }).pipe(
      Options.withDescription('Show console to see logs.'),
      Options.withAlias('d'),
    ),
    provider: Options.choice('provider', Provider.literals).pipe(
      Options.withDescription('AI provider to use.'),
      Options.withAlias('p'),
      Options.withDefault('edge'),
    ),
    model: Options.text('model').pipe(
      Options.withDescription('Model to use.'),
      Options.withAlias('m'),
      Options.withSchema(ModelName),
      Options.optional,
    ),
    blueprints: Options.text('blueprint').pipe(
      Options.withDescription('Blueprints to include in the chat context.'),
      Options.withAlias('b'),
      Options.repeated,
    ),
    // TODO(burdon): Push down (like verbose?)
    logLevel: Options.choice('logLevel', ['debug', 'verbose', 'info', 'warn', 'error']).pipe(
      Options.withDescription('Log level to use.'),
      Options.withAlias('l'),
      Options.withDefault(process.env.DX_DEBUG ?? 'info'),
    ),
    // TODO(burdon): This isn't inherited?
    verbose: Options.boolean('verbose', { ifPresent: true }).pipe(
      Options.withDescription('Verbose logging.'),
      Options.withAlias('v'),
    ),
  },
  (options) =>
    Effect.gen(function* () {
      // const { verbose } = yield* CommandConfig;
      const verbose = options.verbose;

      // Configure logging.
      const logBuffer = createLogBuffer();
      log.config({ filter: options.logLevel });
      log.runtimeConfig.processors = [logBuffer.processor];
      log.info('starting...');

      const client = yield* ClientService;
      const runtime = yield* Effect.runtime<AiChatServices>();
      const service = yield* AiService.AiService;

      const model = Option.getOrElse(options.model, () =>
        Match.value(options.provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      const toolkit = GenericToolkit.merge(...toolkits);
      const processor = new ChatProcessor(runtime, toolkit, functions, service.metadata);
      const [conversation, setConversation] = createSignal<AiConversation | undefined>(undefined);

      invariant(client.halo.identity);
      const space = yield* Effect.promise(async () => {
        // TODO(burdon): Add dynamically.
        await client.addTypes(types);

        // TODO(burdon): Hangs if identity is not ready.
        await client.spaces.waitUntilReady();
        return client.spaces.default;
      });

      const handleConversationCreate = async (blueprints: string[]) => {
        const current = conversation();
        await current?.close();

        log.info('creating conversation', { blueprints });
        const next = await processor.createConversation(space, blueprints);
        setConversation(next);
        return next;
      };

      // TODO(burdon): Load/select previous saved conversation? Need Chat object for state.
      yield* Effect.promise(async () => await handleConversationCreate(options.blueprints));

      // Render.
      yield* renderApp({
        children: () =>
          conversation() ? (
            <Chat
              processor={processor}
              conversation={conversation()!}
              model={model}
              verbose={verbose}
              onConversationCreate={({ blueprints }) => handleConversationCreate(blueprints)}
            />
          ) : undefined,
        focusElements: ['input', 'messages'],
        logBuffer,
        debug: options.debug,
      });
    }),
).pipe(
  Command.withDescription('Open chat interface.'),
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId, functions })),
  Command.provideEffectDiscard(() => withTypes(...typeRegistry)),
);
