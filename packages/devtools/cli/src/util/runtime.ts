//
// Copyright 2025 DXOS.org
//

import type * as ConfigError from 'effect/ConfigError';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import type * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiModelResolver, type AiService } from '@dxos/ai';
import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { spaceLayer } from '@dxos/cli-util';
import { type ClientService } from '@dxos/client';
import { type Database, type Key } from '@dxos/echo';
import {
  CredentialsService,
  type FunctionDefinition,
  type FunctionInvocationService,
  type QueueService,
  TracingService,
} from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
} from '@dxos/functions-runtime';

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | AiService.AiService
  | CredentialsService
  | Database.Service
  | FunctionInvocationService
  | QueueService
  | TracingService;

// TODO(wittjosiah): Factor out.
export const Provider = Schema.Literal('edge', 'lmstudio', 'ollama');
export type Provider = Schema.Schema.Type<typeof Provider>;

export type LayerOptions = {
  provider: Provider;
  spaceId: Option.Option<Key.SpaceId>;
  functions: FunctionDefinition.Any[];
};

// TODO(wittjosiah): Factor out.
export const chatLayer = ({
  provider,
  spaceId,
  functions,
}: LayerOptions): Layer.Layer<AiChatServices, ConfigError.ConfigError, ClientService> => {
  const aiServiceLayer = Match.value(provider).pipe(
    Match.when('edge', () => AiServiceTestingPreset('direct')),
    Match.when('lmstudio', () =>
      AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provideMerge(LMStudioResolver.make())),
    ),
    Match.when('ollama', () =>
      AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provideMerge(OllamaResolver.make())),
    ),
    Match.exhaustive,
  );

  return FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
    Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions })),
    Layer.provideMerge(RemoteFunctionExecutionService.withClient(spaceId, true)),
    Layer.provideMerge(aiServiceLayer),
    Layer.provideMerge(CredentialsService.layerFromDatabase()),
    Layer.provideMerge(spaceLayer(spaceId, true)),
    Layer.provideMerge(TracingService.layerNoop),
  );
};
