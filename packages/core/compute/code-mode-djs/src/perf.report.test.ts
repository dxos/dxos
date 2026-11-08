//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { Database, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import * as DjsSandbox from './DjsSandbox.ts';
import {
  DjsEffectDialect,
  IN_PROCESS,
  Task,
  TASK_DXN,
  TestLayer,
  runEvaluate,
  testEngine,
} from './testing/fixtures.ts';

/**
 * Wall time of one `eval` call through each sandbox, for programs shaped like the corpus: the same
 * program, the same database (100 tasks), warm — the djs session is reused across calls, as a
 * conversation would. Run with `DX_RUN_MANUAL_TESTS=1`; prints a table.
 */
const ROUNDS = 15;

const PROGRAMS: readonly { readonly name: string; readonly code: string }[] = [
  { name: 'print a constant', code: 'yield* print(1);' },
  {
    name: 'query 100 tasks, print count',
    code: `const Task = yield* Database.resolve('${TASK_DXN}');
           yield* print((yield* Database.query(Filter.type(Task)).run).length);`,
  },
  {
    name: 'query + update 100 tasks + flush',
    code: `const Task = yield* Database.resolve('${TASK_DXN}');
           const tasks = yield* Database.query(Filter.type(Task)).run;
           for (const task of tasks) { Obj.update(task, (task) => { task.priority = (task.priority ?? 0) + 1; }); }
           yield* Database.flush();
           yield* print(tasks.length);`,
  },
  {
    name: 'create 20 tasks + flush',
    code: `const Task = yield* Database.resolve('${TASK_DXN}');
           for (let i = 0; i < 20; i++) { yield* Database.add(Obj.make(Task, { title: 'new ' + i, status: 'open' })); }
           yield* Database.flush();
           yield* print('ok');`,
  },
  {
    name: '3 operations, sequential',
    code: `const Score = yield* Database.resolve('dxn:com.example.operation.score');
           for (const title of ['a', 'bb', 'ccc']) { yield* Operation.invoke(Score, { title }); }
           yield* print('ok');`,
  },
  {
    name: 'CPU: 1e6-iteration loop',
    code: 'let sum = 0; for (let i = 0; i < 1e6; i++) { sum += i % 7; } yield* print(sum);',
  },
  {
    name: 'Effect: forEach over 1,000',
    code: 'const xs = yield* Effect.forEach(Array.from({ length: 1000 }, (_, i) => i), (i) => Effect.succeed(i * 2)); yield* print(xs.length);',
  },
  {
    name: 'print 20 object cards',
    code: `const Task = yield* Database.resolve('${TASK_DXN}');
           const tasks = (yield* Database.query(Filter.type(Task)).run).slice(0, 20);
           yield* print(...tasks);`,
  },
];

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const time = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const started = performance.now();
    const value = yield* effect;
    return { value, ms: performance.now() - started };
  });

describe('perf report: djs against in-process', { tags: ['manual'], timeout: 600_000 }, () => {
  it.effect(
    'per-call wall time',
    Effect.fnUntraced(
      function* (_) {
        yield* Effect.forEach(
          Array.from({ length: 100 }, (_, index) => index),
          (index) =>
            Database.add(Obj.make(Task, { title: `task ${index}`, status: index % 2 === 0 ? 'open' : 'done' })),
        );
        yield* Database.flush();

        const engine = yield* Effect.promise(testEngine);
        const djs = { dialect: DjsEffectDialect, sandbox: DjsSandbox.make({ engine }) };
        const rows: string[] = [];
        for (const { name, code } of PROGRAMS) {
          const samples = { inProcess: [] as number[], djs: [] as number[] };
          // One warm-up each: the first djs call opens the session, the first in-process call loads DOCS.
          expect((yield* runEvaluate(code, IN_PROCESS)).ok).toBe(true);
          expect((yield* runEvaluate(code, djs)).ok).toBe(true);
          for (let round = 0; round < ROUNDS; round++) {
            samples.inProcess.push((yield* time(runEvaluate(code, IN_PROCESS))).ms);
            samples.djs.push((yield* time(runEvaluate(code, djs))).ms);
          }
          const [inProcess, inDjs] = [median(samples.inProcess), median(samples.djs)];
          rows.push(`| ${name} | ${inProcess.toFixed(2)} | ${inDjs.toFixed(2)} | ${(inDjs / inProcess).toFixed(1)}x |`);
        }

        const { db } = yield* Database.Service;
        const session = yield* Effect.promise(() => djs.sandbox.session(db));
        const opens = yield* Effect.forEach(Array.from({ length: ROUNDS }), () =>
          time(Effect.promise(() => engine.open(db))).pipe(
            Effect.tap(({ value }) => Effect.sync(() => value.dispose())),
            Effect.map(({ ms }) => ms),
          ),
        );
        djs.sandbox.dispose();

        console.log(
          [
            '',
            `| program (median of ${ROUNDS}, ms) | in-process | djs | ratio |`,
            '| --- | --- | --- | --- |',
            ...rows,
            '',
            `base image ${(engine.baseBytes / 1024 / 1024).toFixed(1)} MB built in ${engine.baseMillis.toFixed(0)} ms; ` +
              `session open ${median(opens).toFixed(1)} ms; session heap ${(session.heapSize / 1024 / 1024).toFixed(1)} MB`,
          ].join('\n'),
        );
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
