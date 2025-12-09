//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import { render } from '@opentui/solid';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';

import {
  AiModelResolver,
  AiService,
  DEFAULT_EDGE_MODEL,
  DEFAULT_LMSTUDIO_MODEL,
  DEFAULT_OLLAMA_MODEL,
  ModelName,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import {
  AiConversation,
  type AiConversationRunParams,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { type Database } from '@dxos/echo';
import { throwCause } from '@dxos/effect';
import {
  CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  TracingService,
  defineFunction,
} from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
} from '@dxos/functions-runtime';
import { type Message } from '@dxos/types';

import { withDatabase } from '../../util';

import { InputTest } from './Chat';

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | AiModelResolver.AiModelResolver
  | AiService.AiService
  | CredentialsService
  | Database.Service
  | FunctionInvocationService
  | QueueService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

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
      const services = yield* Effect.runtime<AiChatServices>();
      const client = yield* ClientService;

      const model = Option.getOrElse(model$, () =>
        Match.value(provider).pipe(
          Match.when('lmstudio', () => DEFAULT_LMSTUDIO_MODEL),
          Match.when('ollama', () => DEFAULT_OLLAMA_MODEL),
          Match.when('edge', () => DEFAULT_EDGE_MODEL),
          Match.orElse(() => DEFAULT_EDGE_MODEL),
        ),
      );

      const conversation = yield* Effect.promise(async () => {
        await client.spaces.waitUntilReady();
        const space = client.spaces.default;
        const queue = space.queues.create<Message.Message>();
        return new AiConversation(queue);
      });

      const request = async (params: AiConversationRunParams) => {
        const request = conversation.createRequest(params);
        const fiber = request.pipe(Effect.provide(AiService.model(model)), Effect.asVoid, Runtime.runFork(services));

        const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
        if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
          throwCause(response.cause);
        }
      };

      // const app = new App(request);
      // yield* Effect.promise(() => app.initialize());

      yield* Effect.promise(() => render(InputTest));

      // Hold process open and sleep to allow interactivity in ui.
      do {
        yield* Effect.sleep(999_999_999);
      } while (true);
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
