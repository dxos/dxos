//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Database, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Person, Pipeline, Task } from '@dxos/types';

import { LINEAR_ID_KEY, default as fetchLinearIssues } from './sync-issues';

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(fetchLinearIssues),
  types: [Task.Task, Person.Person, Pipeline.Pipeline],
  credentials: [{ service: 'linear.app', apiKey: process.env.LINEAR_API_KEY }],
  tracing: 'pretty',
});

describe.skip('Linear', { timeout: 600_000 }, () => {
  it.effect(
    'sync',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.flush();

        yield* Operation.invoke(fetchLinearIssues, {
          team: '1127c63a-6f77-4725-9229-50f6cd47321c',
        });

        const persons = yield* Database.query(Query.type(Person.Person)).run;
        console.log('people', {
          count: persons.length,
          people: persons.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const projects = yield* Database.query(Query.type(Pipeline.Pipeline)).run;
        console.log('projects', {
          count: projects.length,
          projects: projects.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });
        const tasks = yield* Database.query(Query.type(Task.Task)).run;
        console.log('tasks', {
          count: tasks.length,
          tasks: tasks.map((_) => `(${_.id}) ${Obj.getLabel(_)} [${Obj.getKeys(_, LINEAR_ID_KEY)[0]?.id}]`),
        });

        yield* Database.flush();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { tags: ['sync'] },
  );
});
