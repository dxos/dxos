//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import { render } from '@opentui/solid';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiModelResolver, DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL, ModelName } from '@dxos/ai';
import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import { AiConversation, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { CredentialsService, TracingService, defineFunction } from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
} from '@dxos/functions-runtime';
import { type Message } from '@dxos/types';

import { withDatabase } from '../../util';

import { Chat } from './Chat';
import { type AiChatServices } from './types';

const TestToolkit = Toolkit.make(
  Tool.make('random', {
    description: 'Generates a random number.',
    parameters: {},
    success: Schema.Number,
  }),
);

// TODO(burdon): Create minimal toolkit.
const toolkit = Toolkit.merge(TestToolkit) as Toolkit.Toolkit<any>;

// TODO(burdon): Not hooked up.
const fn = defineFunction({
  key: 'example.com/function/random',
  name: 'Random',
  description: 'Generates a random number.',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Struct({
    value: Schema.Number,
  }),
  handler: Effect.fn(function* () {
    return {
      value: Math.floor(Math.random() * 100),
    };
  }),
});

const functions = [fn];

export const chat = Command.make(
  'chat',
  {
    provider: Options.choice('provider', ['ollama', 'lmstudio', 'edge']).pipe(
      Options.withDescription('AI provider to use.'),
      Options.withAlias('p'),
    ),
    model: Options.text('model').pipe(
      Options.withSchema(ModelName),
      Options.optional,
      Options.withDescription('Model to use.'),
      Options.withAlias('m'),
    ),
  },
  ({ provider, model: model$ }) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<AiChatServices>();
      const client = yield* ClientService;

      const conversation = yield* Effect.promise(async () => {
        await client.spaces.waitUntilReady();
        const space = client.spaces.default;
        const queue = space.queues.create<Message.Message>();
        return new AiConversation(queue);
      });

      const model = Option.getOrElse(model$, () =>
        Match.value(provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      // TODO(wittjosiah): Shouldn't opentui have a way to cleanup the renderer?
      // This attempts to cleanup the terminal when exiting the process so that it doesn't lock up and output garbage.
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          // Disable mouse tracking
          process.stdout.write('\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l');
          // Exit alternate screen buffer
          process.stdout.write('\x1b[?1049l');
          // Show cursor
          process.stdout.write('\x1b[?25h');
          // Reset attributes
          process.stdout.write('\x1b[0m');
          // Restore cooked mode
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
        }),
      );

      yield* Effect.promise(() => render(() => <Chat conversation={conversation} runtime={runtime} model={model} />));

      // Hold process open and sleep to allow interactivity in ui.
      return yield* Effect.never;
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          makeToolResolverFromFunctions(functions, toolkit),
          makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
          TracingService.layerNoop,
        ).pipe(
          Layer.provideMerge(
            FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
              Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions })),
              Layer.provideMerge(RemoteFunctionExecutionService.layerMock),
              Layer.provideMerge(CredentialsService.layerFromDatabase()),
            ),
          ),
        ),
      ),
      withDatabase(),
    ),
).pipe(
  Command.withDescription('Open chat interface.'),
  Command.provide(({ provider }) => {
    const resolver = Match.value(provider).pipe(
      Match.when('lmstudio', () => LMStudioResolver.make()),
      Match.when('ollama', () => OllamaResolver.make()),
      Match.orElseAbsurd,
    );

    return AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provideMerge(resolver));
  }),
);
