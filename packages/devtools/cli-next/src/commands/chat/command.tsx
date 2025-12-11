//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import { ConsolePosition } from '@opentui/core';
import { render } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { AiService, DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL, ModelName } from '@dxos/ai';
import { GenericToolkit } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { CommandConfig } from '../../services';
import { type AiChatServices, Provider, TestToolkit, chatLayer, createLogBuffer, withTypes } from '../../util';
import { Common } from '../options';

import { App, Chat } from './components';
import { ChatProcessor } from './processor';
import { theme } from './theme';

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
      Options.withDefault('info'),
    ),
  },
  (options) =>
    Effect.gen(function* () {
      const logBuffer = createLogBuffer();
      log.config({
        filter: options.logLevel,
      });
      log.runtimeConfig.processors = [logBuffer.processor];

      const client = yield* ClientService;
      const runtime = yield* Effect.runtime<AiChatServices>();
      const service = yield* AiService.AiService;
      const { verbose } = yield* CommandConfig;

      const model = Option.getOrElse(options.model, () =>
        Match.value(options.provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      const toolkit = GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer);
      const processor = new ChatProcessor(runtime, toolkit, service.metadata);
      const conversation = yield* Effect.promise(async () => {
        invariant(client.halo.identity);
        // TODO(burdon): Hangs if identity is not ready.
        await client.spaces.waitUntilReady();
        const space = client.spaces.default;
        return processor.createConversation(space, options.blueprints);
      });

      yield* Effect.acquireRelease(
        Effect.promise(() =>
          render(
            () => (
              <App showConsole={options.debug} focusElements={['input', 'messages']} logBuffer={logBuffer}>
                <Chat processor={processor} conversation={conversation} model={model} verbose={verbose} />
              </App>
            ),
            {
              exitSignals: ['SIGINT', 'SIGTERM'],
              consoleOptions: {
                position: ConsolePosition.TOP,
                colorDefault: theme.log.default,
                colorDebug: theme.log.debug,
                colorInfo: theme.log.info,
                colorWarn: theme.log.warn,
                colorError: theme.log.error,
              },
            },
          ),
        ),
        () => Effect.sync(() => {}),
      );

      // Wait for user to exit.
      return yield* Effect.never;
    }),
).pipe(
  Command.withDescription('Open chat interface.'),
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId })),
  Command.provideEffectDiscard(() => withTypes(Blueprint.Blueprint)),
);
