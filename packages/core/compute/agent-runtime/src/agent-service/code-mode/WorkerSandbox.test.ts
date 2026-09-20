//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { callTool } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';

import { AssistantTestLayer } from '../../testing/index.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { SandboxOperation } from './Dialect.ts';
import { EVAL_TOOL_NAME, makeEvalToolkit } from './eval-tool.ts';
import * as WorkerSandbox from './WorkerSandbox.ts';

EntityId.dangerouslyDisableRandomness();

const TASK_TYPENAME = 'com.example.type.task';

class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    status: Schema.String,
    priority: Schema.optional(Schema.Number),
  }),
) {}

const TestLayer = AssistantTestLayer({ types: [Task, Feed.Feed] });

/** Stands in for a skill-bound tool, so the worker's `ops` group has something to call. */
const ScoreOperation: SandboxOperation = {
  name: 'score',
  description: 'Scores a title',
  parameters: {},
  invoke: (input: unknown) => Effect.succeed((input as { title: string }).title.length),
};

const seedTasks = Effect.fnUntraced(function* () {
  yield* Effect.forEach(
    [
      Obj.make(Task, { title: 'Write the docs', status: 'open' }),
      Obj.make(Task, { title: 'Fix the build', status: 'open' }),
      Obj.make(Task, { title: 'Ship the release', status: 'done' }),
    ],
    (task) => Database.add(task),
  );
  yield* Database.flush();
});

/** Runs `code` in a worker exactly as a turn would, returning what it printed. */
const runInWorker = Effect.fnUntraced(function* (code: string, timeout?: Duration.Input) {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  const toolkit = makeEvalToolkit({
    dialect: PlainDialect,
    sandbox: WorkerSandbox.make(),
    runtime,
    operations: [ScoreOperation],
    timeout,
  });
  const result = yield* callTool(yield* toolkit.handlers, {
    _tag: 'toolCall',
    toolCallId: 'test',
    name: EVAL_TOOL_NAME,
    input: JSON.stringify({ code }),
    providerExecuted: false,
  });
  expect(result.error).toBeUndefined();
  return JSON.parse(String(result.result)).output as string;
});

describe('worker sandbox', () => {
  it.effect(
    'reads and writes the database from another thread',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();

        // Every one of these calls crossed the thread boundary: the code ran in the worker, each
        // binding was an RPC back here, and `update` took a patch because a mutator cannot cross.
        const output = yield* runInWorker(`
          const tasks = await query('${TASK_TYPENAME}', { status: 'open' });
          for (const task of tasks) {
            await update(task, { priority: task.title.length });
          }
          await flush();
          print('updated:', tasks.length);
        `);
        expect(output).toEqual('updated: 2');

        // Read back on the host: the worker's writes landed on the real objects, not on copies.
        const open = yield* Database.query(Filter.type(Task)).run;
        expect(
          open
            .filter((task) => task.priority !== undefined)
            .map((task) => task.priority)
            .sort(),
        ).toEqual([13, 14]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'creates an object and invokes an operation from inside the worker',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runInWorker(`
          const task = await make('${TASK_TYPENAME}', { title: 'Review the PR', status: 'open' });
          await add(task);
          await flush();
          print('scored:', await ops.score({ title: task.title }));
        `);
        expect(output).toEqual('scored: 13');

        const stored = yield* Database.query(Filter.type(Task)).run;
        expect(stored.map((task) => task.title)).toEqual(['Review the PR']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports a throw in the worker as output rather than failing the turn',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runInWorker("throw new Error('boom');");
        expect(output).toEqual('Error: boom');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports a failing binding back to the code that called it',
    Effect.fnUntraced(
      function* (_) {
        const output = yield* runInWorker(`
          try {
            await make('com.example.type.missing', { title: 'x' });
            print('no error');
          } catch (error) {
            print('caught:', error.message.length > 0);
          }
        `);
        expect(output).toEqual('caught: true');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // `it.live` rather than `it.effect`: the budget is wall-clock, and `it.effect` runs against a
  // virtual clock that never reaches the deadline.
  it.live(
    'kills a worker whose code never finishes',
    Effect.fnUntraced(
      function* (_) {
        // A synchronous loop: the case the in-process sandbox cannot even observe, let alone stop,
        // because it blocks the thread the timeout would have to fire on.
        const output = yield* runInWorker('while (true) {}', '500 millis');
        expect(output).toContain('the worker was killed');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
