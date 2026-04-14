//
// Copyright 2025 DXOS.org
//

import type * as ConfigError from 'effect/ConfigError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import type * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiModelResolver, type AiService } from '@dxos/ai';
import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { spaceLayer } from '@dxos/cli-util';
import { type ClientService } from '@dxos/client';
import { type Database, Feed, type Key } from '@dxos/echo';
import { CredentialsService, type QueueService, Trace, TracingService } from '@dxos/functions';
import { NoHandlerError, Operation, type OperationHandlerSet } from '@dxos/operation';

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | AiService.AiService
  | CredentialsService
  | Database.Service
  | Feed.FeedService
  | Operation.Service
  | QueueService
  | TracingService
  | Trace.TraceService;

// TODO(wittjosiah): Factor out.
export const Provider = Schema.Literal('edge', 'lmstudio', 'ollama');
export type Provider = Schema.Schema.Type<typeof Provider>;

export type LayerOptions = {
  provider: Provider;
  spaceId: Option.Option<Key.SpaceId>;
  functions: OperationHandlerSet.OperationHandlerSet;
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

  const operationServiceLayer = Layer.effect(
    Operation.Service,
    Effect.gen(function* () {
      const handlers = yield* functions.handlers;
      return {
        invoke: (op: Operation.Definition.Any, ...args: [any?, any?]) => {
          const input = args[0];
          const handler = handlers.find((handler) => handler.meta.key === op.meta.key);
          if (!handler) {
            return Effect.fail(new NoHandlerError(op.meta.key));
          }
          return handler.handler(input) as Effect.Effect<any, NoHandlerError>;
        },
        schedule: () => Effect.void,
        invokePromise: async () => ({ error: new Error('Not implemented in CLI runtime') }),
      } satisfies Operation.OperationService;
    }),
  );

  return operationServiceLayer.pipe(
    Layer.provideMerge(aiServiceLayer),
    Layer.provideMerge(CredentialsService.layerFromDatabase()),
    Layer.provideMerge(spaceLayer(spaceId, true)),
    Layer.provideMerge(TracingService.layerNoop),
    Layer.provideMerge(Trace.writerLayerNoop),
    Layer.provideMerge(Feed.notAvailable),
  );
};
