//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Obj, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, FunctionInvocationService } from '@dxos/functions';
import { TracingServiceExt } from '@dxos/functions-runtime';
import {
  FunctionInvocationServiceLayerTestMocked,
  TestDatabaseLayer,
  testStoragePath,
} from '@dxos/functions-runtime/testing';
import { Person, Project, Task } from '@dxos/types';

import { LINEAR_ID_KEY, default as fetchLinearIssues } from './sync-issues';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], Toolkit.make()),
  makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        // indexing: { vector: true },
        types: [Task.Task, Person.Person, Project.Project],
        storagePath: testStoragePath({ name: 'feed-test-13' }),
      }),
      CredentialsService.layerConfig([{ service: 'linear.app', apiKey: Config.redacted('LINEAR_API_KEY') }]),
      FunctionInvocationServiceLayerTestMocked({
        functions: [fetchLinearIssues],
      }).pipe(Layer.provideMerge(TracingServiceExt.layerLogInfo())),
      FetchHttpClient.layer,
    ),
  ),
);

describe('Linear', { timeout: 600_000 }, () => {
  it.effect(
    'sync',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.Service.flush({ indexes: true });

        yield* FunctionInvocationService.invokeFunction(fetchLinearIssues, {
          team: '1127c63a-6f77-4725-9229-50f6cd47321c',
        });

        const persons = yield* Database.Service.runQuery(Query.type(Person.Person));
        console.log('people', {
          count: persons.length,
          people: persons.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const projects = yield* Database.Service.runQuery(Query.type(Project.Project));
        console.log('projects', {
          count: projects.length,
          projects: projects.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const tasks = yield* Database.Service.runQuery(Query.type(Task.Task));
        console.log('tasks', {
          count: tasks.length,
          tasks: tasks.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });

        yield* Database.Service.flush({ indexes: true });
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('sync'),
    ),
  );
});
