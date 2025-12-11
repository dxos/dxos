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
import { ClientService } from '@dxos/client';
import { invariant } from '@dxos/invariant';

import { CommandConfig } from '../../services';
import { type AiChatServices, Provider, TestToolkit, chatLayer } from '../../util';
import { Common } from '../options';

import { App, Chat } from './components';
import { ChatProcessor } from './processor';

export const chat = Command.make(
  'chat',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
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
    // TODO(burdon): --debug?
    showConsole: Options.boolean('console', { ifPresent: true }).pipe(
      Options.withDescription('Show console to see logs.'),
    ),
  },
  ({ provider, model: modelParam, showConsole }) =>
    Effect.gen(function* () {
      const { verbose } = yield* CommandConfig;
      const client = yield* ClientService;
      const runtime = yield* Effect.runtime<AiChatServices>();
      const service = yield* AiService.AiService;

      const model = Option.getOrElse(modelParam, () =>
        Match.value(provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      // TODO(burdon): From blueprints.
      const toolkit = GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer);
      const processor = new ChatProcessor(runtime, toolkit, service.metadata);
      const conversation = yield* Effect.promise(async () => {
        invariant(client.halo.identity);
        // TODO(burdon): Hangs if identity is not ready.
        await client.spaces.waitUntilReady();
        const space = client.spaces.default;
        return processor.createConversation(space);
      });

      yield* Effect.async<void>(() => {
        void render(
          () => (
            <App showConsole={showConsole} focusElements={['input', 'messages']}>
              <Chat processor={processor} conversation={conversation} model={model} verbose={verbose} />
            </App>
          ),
          {
            exitSignals: ['SIGINT', 'SIGTERM'],
            consoleOptions: {
              position: ConsolePosition.TOP,              
            },
          },
        );
      });
    }),
).pipe(
  Command.withDescription('Open chat interface.'),
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId })),
);
