//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import type * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiModelResolver, type AiService, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import { GenericToolkit, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { ClientService } from '@dxos/client';
import { type Database, type Key } from '@dxos/echo';
import { CredentialsService, type FunctionInvocationService, type QueueService, TracingService } from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
} from '@dxos/functions-runtime';

import { spaceLayer } from './space';
import * as TestToolkit from './test-toolkit';

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

// TODO(wittjosiah): Factor out.
export const Provider = Schema.Literal('lmstudio', 'ollama', 'edge');
export type Provider = Schema.Schema.Type<typeof Provider>;

// TODO(wittjosiah): Factor out.
export const chatLayer = ({
  provider,
  spaceId,
}: {
  provider: Provider;
  spaceId: Option.Option<Key.SpaceId>;
}): Layer.Layer<AiChatServices, never, ClientService> => {
  const testToolkit = GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer);
  const mergedToolkit = GenericToolkit.merge(
    ...[
      //
      testToolkit,
    ],
  );
  const toolkit = mergedToolkit.toolkit;
  const toolkitLayer = mergedToolkit.layer;

  const resolver = Match.value(provider).pipe(
    Match.when('lmstudio', () => LMStudioResolver.make()),
    Match.when('ollama', () => OllamaResolver.make()),
    Match.orElseAbsurd,
  );

  return Layer.mergeAll(
    TracingService.layerNoop,
    makeToolResolverFromFunctions(TestToolkit.functions, toolkit),
    makeToolExecutionServiceFromFunctions(toolkit, toolkitLayer),
  ).pipe(
    Layer.provideMerge(
      FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
        Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: TestToolkit.functions })),
        Layer.provideMerge(RemoteFunctionExecutionService.withClient(spaceId, true)),
        Layer.provideMerge(AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provideMerge(resolver))),
        Layer.provideMerge(CredentialsService.layerFromDatabase()),
        Layer.provideMerge(spaceLayer(spaceId, true)),
      ),
    ),
  );
};

export const withTypes: (
  types: Schema.Schema.AnyNoContext[],
) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, ClientService | R> = (types) =>
  Effect.fnUntraced(function* (effect) {
    const client = yield* ClientService;
    yield* Effect.promise(() => client.addTypes(types));
    return yield* effect;
  });
