//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { GenericToolkit } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { ToolExecutionServices } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, TracingService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { Operation, OperationHandlerSet, OperationRegistry } from '@dxos/operation';

import { default as fetchMessages } from './fetch-messages';

const handlers = OperationHandlerSet.make(fetchMessages);

const OperationServiceLayer = Layer.effect(
  Operation.Service,
  Effect.gen(function* () {
    const resolved = yield* handlers.handlers;
    return {
      invoke: (op: any, ...args: any[]) => {
        const handler = resolved.find((h: any) => h.meta.key === op.meta.key);
        if (!handler) {
          return Effect.die(`No handler found for operation: ${op.meta.key}`);
        }
        const result = handler.handler(args[0]);
        if (Effect.isEffect(result)) {
          return result as Effect.Effect<unknown>;
        }
        return Effect.promise(() => Promise.resolve(result));
      },
      schedule: () => Effect.void,
      invokePromise: async () => ({ error: new Error('Not implemented') }),
    } as Operation.OperationService;
  }),
);

const TestLayer = Layer.mergeAll(AiService.model('@anthropic/claude-opus-4-0'), ToolExecutionServices).pipe(
  Layer.provideMerge(OperationServiceLayer),
  Layer.provideMerge(OperationRegistry.layer),
  Layer.provideMerge(OperationHandlerSet.provide(handlers)),
  Layer.provideMerge(
    Layer.mergeAll(
      GenericToolkit.providerEmpty,
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({}),
      CredentialsService.layerConfig([{ service: 'discord.com', apiKey: Config.redacted('DISCORD_TOKEN') }]),
      FetchHttpClient.layer,
      TracingService.layerNoop,
    ),
  ),
);

const DXOS_SERVER_ID = '837138313172353095';

describe('Feed', { timeout: 600_000 }, () => {
  it.effect(
    'fetch discord messages',
    Effect.fnUntraced(
      function* (_) {
        const messages = yield* Operation.invoke(fetchMessages, {
          serverId: DXOS_SERVER_ID,
          last: '7d',
        }).pipe(Effect.orDie);
        console.log(messages);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('sync'),
    ),
  );
});
