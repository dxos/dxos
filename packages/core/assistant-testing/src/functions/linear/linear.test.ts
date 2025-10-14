//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Test from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer, testStoragePath } from '@dxos/functions/testing';
import { DataType } from '@dxos/schema';

import { LINEAR_ID_KEY, default as fetchLinearIssues } from './sync-issues';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], Toolkit.make()),
  makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        // indexing: { vector: true },
        types: [DataType.Task, DataType.Person, DataType.Project],
        storagePath: testStoragePath({ name: 'feed-test-13' }),
      }),
      CredentialsService.layerConfig([{ service: 'linear.app', apiKey: Config.redacted('LINEAR_API_KEY') }]),
      FunctionInvocationService.layerTestMocked({ functions: [fetchLinearIssues] }).pipe(
        Layer.provideMerge(ComputeEventLogger.layerFromTracing),
        Layer.provideMerge(TracingService.layerLogInfo()),
      ),
      FetchHttpClient.layer,
    ),
  ),
);

Test.describe('Linear', { timeout: 600_000 }, () => {
  Test.it.effect(
    'sync',
    Effect.fnUntraced(
      function* (_) {
        yield* DatabaseService.flush({ indexes: true });

        yield* FunctionInvocationService.invokeFunction(fetchLinearIssues, {
          team: '1127c63a-6f77-4725-9229-50f6cd47321c',
        });

        const { objects: persons } = yield* DatabaseService.runQuery(Query.type(DataType.Person));
        console.log('people', {
          count: persons.length,
          people: persons.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const { objects: projects } = yield* DatabaseService.runQuery(Query.type(DataType.Project));
        console.log('projects', {
          count: projects.length,
          projects: projects.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
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
