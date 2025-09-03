//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Config, Effect, Layer, Redacted } from 'effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  LocalFunctionExecutionService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer, testStoragePath } from '@dxos/functions/testing';
import { AiToolkit } from '@effect/ai';
import { default as fetchLinearIssues, LINEAR_ID_KEY } from './sync-issues';
import { Obj, Query } from '@dxos/echo';
import { DataType } from '@dxos/schema';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], AiToolkit.make()),
  makeToolExecutionServiceFromFunctions([], AiToolkit.make() as any, Layer.empty as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        // indexing: { vector: true },
        types: [DataType.Task, DataType.Person],
        storagePath: testStoragePath({ name: 'feed-test-5' }),
      }),
      CredentialsService.layerConfig([{ service: 'linear.app', apiKey: Config.redacted('LINEAR_API_KEY') }]),
      LocalFunctionExecutionService.layer,
      RemoteFunctionExecutionService.mockLayer,
      TracingService.layerLogInfo(),
      FetchHttpClient.layer,
    ),
  ),
);

describe('Linear', { timeout: 600_000 }, () => {
  it.effect(
    'sync',
    Effect.fnUntraced(
      function* ({ expect: _ }) {
        yield* DatabaseService.flush({ indexes: true });

        yield* LocalFunctionExecutionService.invokeFunction(fetchLinearIssues, {
          team: '1127c63a-6f77-4725-9229-50f6cd47321c',
        });

        const { objects: persons } = yield* DatabaseService.runQuery(Query.type(DataType.Person));
        console.log('people', {
          count: persons.length,
          people: persons.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const { objects: tasks } = yield* DatabaseService.runQuery(Query.type(DataType.Task));
        console.log('tasks', {
          count: tasks.length,
          tasks: tasks.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });

        yield* DatabaseService.flush({ indexes: true });
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('sync'),
    ),
  );
});
