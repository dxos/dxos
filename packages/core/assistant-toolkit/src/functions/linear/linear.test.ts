//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Obj, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { Person, Pipeline, Task } from '@dxos/types';

import { LINEAR_ID_KEY, default as fetchLinearIssues } from './sync-issues';

const TestLayer = AssistantTestLayer({
  functions: [fetchLinearIssues],
  types: [Task.Task, Person.Person, Pipeline.Pipeline],
  credentials: [{ service: 'linear.app', apiKey: process.env.LINEAR_API_KEY }],
  tracing: 'pretty',
});

describe.skip('Linear', { timeout: 600_000 }, () => {
  it.effect(
    'sync',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.flush({ indexes: true });

        yield* FunctionInvocationService.invokeFunction(fetchLinearIssues, {
          team: '1127c63a-6f77-4725-9229-50f6cd47321c',
        });

        const persons = yield* Database.runQuery(Query.type(Person.Person));
        console.log('people', {
          count: persons.length,
          people: persons.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const projects = yield* Database.runQuery(Query.type(Pipeline.Pipeline));
        console.log('projects', {
          count: projects.length,
          projects: projects.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const tasks = yield* Database.runQuery(Query.type(Task.Task));
        console.log('tasks', {
          count: tasks.length,
          tasks: tasks.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });

        yield* Database.flush({ indexes: true });
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('sync'),
      TestHelpers.provideTestContext,
    ),
  );
});
