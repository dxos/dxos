//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import { render } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { AiService, DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL, ModelName } from '@dxos/ai';
import { AiConversation, GenericToolkit } from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { type Message } from '@dxos/types';

import { type AiChatServices, Provider, TestToolkit, chatLayer } from '../../util';
import { Common } from '../options';

import { Chat } from './components';
import { restoreTerminal } from './hooks';

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
  },
  ({ provider, model: modelParam }) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<AiChatServices>();
      const client = yield* ClientService;

      const model = Option.getOrElse(modelParam, () =>
        Match.value(provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      // TODO(burdon): Create processor abstraction (move out of Chat UX).
      const toolkit = GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer);
      const conversation = yield* Effect.promise(async () => {
        await client.spaces.waitUntilReady();
        const space = client.spaces.default;
        const queue = space.queues.create<Message.Message>();
        return new AiConversation(queue, toolkit.toolkit);
      });

      // Ensure clean exit on errors or signals.
      const cleanup = () => {
        restoreTerminal();
        process.exit(1);
      };
      process.on('uncaughtException', cleanup);
      process.on('unhandledRejection', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      const service = yield* AiService.AiService;
      yield* Effect.async<void>(() => {
        void render(
          () => (
            <Chat
              conversation={conversation}
              runtime={runtime}
              model={model}
              metadata={service.metadata}
              toolkit={toolkit}
            />
          ),
          {
            exitOnCtrlC: false, // Handle Ctrl-C ourselves.
          },
        );
      });
    }),
).pipe(
  Command.withDescription('Open chat interface.'),
  Command.provide(({ provider, spaceId }) => chatLayer({ provider, spaceId })),
);
