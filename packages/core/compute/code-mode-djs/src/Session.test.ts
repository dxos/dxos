//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { type BindingsContext } from '@dxos/agent-code-mode';
import type * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { rowOf } from './Bridge.ts';
import * as DjsSandbox from './DjsSandbox.ts';
import { type Session } from './Session.ts';
import {
  DjsEffectDialect,
  IN_PROCESS,
  OPERATIONS,
  Task,
  TASK_DXN,
  TestLayer,
  runEvaluate,
  seedTasks,
  testEngine,
} from './testing/fixtures.ts';

/** A binding context over the test's services that collects what the program printed. */
const bindingsContext = Effect.fnUntraced(function* () {
  const runtime = yield* Effect.context<Database.Service | Operation.Service>();
  const printed: string[] = [];
  const context: BindingsContext = {
    runtime,
    operations: OPERATIONS,
    print: (...values) => printed.push(values.map(String).join(' ')),
  };
  return { context, printed };
});

/** Evaluates in `session`, returning what the program printed; fails the test if the program failed. */
const run = Effect.fnUntraced(function* (session: Session, program: string) {
  const { context, printed } = yield* bindingsContext();
  const result = yield* Effect.promise(() => session.evaluate(program, context));
  if (!result.ok) {
    return yield* Effect.die(new Error(`program failed: ${result.message}`));
  }
  return printed.join('\n');
});

const openSession = Effect.fnUntraced(function* () {
  const engine = yield* Effect.promise(testEngine);
  const { db } = yield* Database.Service;
  return yield* Effect.acquireRelease(
    Effect.promise(() => engine.open(db)),
    (session) => Effect.sync(() => session.dispose()),
  );
});

describe('djs session', () => {
  it.effect(
    'T-1: a program written for the in-process sandbox runs unchanged',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();
        const engine = yield* Effect.promise(testEngine);
        const djs = { dialect: DjsEffectDialect, sandbox: DjsSandbox.make({ engine }) };
        const program = `
          const Task = yield* Database.resolve('${TASK_DXN}');
          const open = yield* Database.query(Filter.type(Task, { status: 'open' })).run;
          const Score = yield* Database.resolve('dxn:com.example.operation.score');
          const scores = [];
          for (const task of open) {
            scores.push({ title: task.title, score: yield* Operation.invoke(Score, { title: task.title }) });
          }
          scores.sort((a, b) => b.score - a.score);
          yield* print(scores.map((s) => s.title + '=' + s.score).join(', '));
        `;
        const reference = yield* runEvaluate(program, IN_PROCESS);
        const actual = yield* runEvaluate(program, djs);
        expect(actual).toEqual(reference);
        expect(actual).toEqual({ ok: true, output: 'Write the docs=14, Fix the build=13' });
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'T-2: variables survive between evaluations, live objects included',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();
        const session = yield* openSession();
        expect(
          yield* run(
            session,
            `const Task = yield* Database.resolve('${TASK_DXN}');
             const tasks = yield* Database.query(Filter.type(Task)).run;
             let count = tasks.length;
             function label(task) { return task.title.toUpperCase(); }
             yield* print(count);`,
          ),
        ).toEqual('3');
        expect(
          yield* run(
            session,
            `Obj.update(tasks[0], (t) => { t.title = 'x'; });
             count = count + 1;
             yield* print(count, label(tasks[0]));`,
          ),
        ).toEqual('4 X');
        const titles = (yield* Database.query(Filter.type(Task)).run).map((task) => task.title);
        expect(titles).toContain('x');
        expect(session.names).toEqual(expect.arrayContaining(['Task', 'tasks', 'count', 'label']));
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a variable holding an object sees what the host changed in between',
    Effect.fnUntraced(
      function* (_) {
        const { tasks } = yield* seedTasks();
        const session = yield* openSession();
        yield* run(session, `const [first] = yield* Database.query(Filter.id('${tasks[0].id}')).run;`);
        Obj.update(tasks[0], (task) => {
          task.title = 'renamed on the host';
        });
        yield* Database.flush();
        expect(yield* run(session, 'yield* print(first.title);')).toEqual('renamed on the host');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'bindings made before a failure are kept, and redeclaring a name replaces it',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* openSession();
        const { context } = yield* bindingsContext();
        const failed = yield* Effect.promise(() =>
          session.evaluate("const kept = 41; throw new Error('boom');", context),
        );
        expect(failed).toEqual({ ok: false, message: 'boom' });
        expect(yield* run(session, 'const kept2 = kept + 1; yield* print(kept2);')).toEqual('42');
        expect(yield* run(session, "const kept = 'again'; yield* print(kept);")).toEqual('again');
        expect(yield* run(session, '{ const inner = 1; } yield* print(typeof inner);')).toEqual('undefined');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'T-3: opening a session reuses the base image',
    Effect.fnUntraced(
      function* (_) {
        const engine = yield* Effect.promise(testEngine);
        const { db } = yield* Database.Service;
        // The first session over these types builds the image the rest copy.
        const firstStarted = performance.now();
        (yield* Effect.promise(() => engine.open(db))).dispose();
        const first = performance.now() - firstStarted;
        const count = 20;
        const started = performance.now();
        const sessions = yield* Effect.promise(() => Promise.all(Array.from({ length: count }, () => engine.open(db))));
        const mean = (performance.now() - started) / count;
        sessions.forEach((session) => session.dispose());
        console.log(
          `base image: ${(engine.baseBytes / 1024).toFixed(0)} KiB, built in ${engine.baseMillis.toFixed(0)} ms; ` +
            `first session over these types: ${first.toFixed(0)} ms; ` +
            `session open: ${mean.toFixed(2)} ms mean over ${count}`,
        );
        expect(mean).toBeLessThan(engine.baseMillis / 4);
        expect(mean).toBeLessThan(25);
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'T-4: a snapshot restores into a new engine with its variables live',
    Effect.fnUntraced(
      function* (_) {
        yield* seedTasks();
        const session = yield* openSession();
        yield* run(
          session,
          `const Task = yield* Database.resolve('${TASK_DXN}');
           const [task] = yield* Database.query(Filter.type(Task, { title: 'Fix the build' })).run;
           const plain = { answer: 42, list: [1, 2, 3] };
           const double = (n) => n * 2;`,
        );
        const { context } = yield* bindingsContext();
        const bytes = session.snapshot(context);
        expect(bytes).toBeInstanceOf(Uint8Array);

        const { Engine } = yield* Effect.promise(() => import('./Engine.ts'));
        const { loadGuestBundle } = yield* Effect.promise(() => import('./GuestBundle.ts'));
        const fresh = yield* Effect.promise(async () => Engine.make({ bundle: await loadGuestBundle() }));
        const restored = yield* Effect.acquireRelease(
          Effect.promise(() => fresh.restore(bytes)),
          (restored) => Effect.sync(() => restored.dispose()),
        );
        expect(
          yield* run(
            restored,
            `yield* print(task.title, plain.answer, double(plain.list.length));
             Obj.update(task, (t) => { t.status = 'done'; });`,
          ),
        ).toEqual('Fix the build 42 6');
        const done = yield* Database.query(Filter.type(Task, { title: 'Fix the build' })).run;
        expect(done[0].status).toEqual('done');
        console.log(`snapshot: ${(bytes.byteLength / 1024).toFixed(0)} KiB`);
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a snapshot from another guest bundle is refused, naming the difference',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* openSession();
        const { context } = yield* bindingsContext();
        const bytes = session.snapshot(context);
        const { Engine } = yield* Effect.promise(() => import('./Engine.ts'));
        const { loadGuestBundle } = yield* Effect.promise(() => import('./GuestBundle.ts'));
        const other = yield* Effect.promise(async () => {
          const bundle = await loadGuestBundle();
          return Engine.make({ bundle: { code: bundle.code, hash: 'another' } });
        });
        const error = yield* Effect.promise(() =>
          other.restore(bytes).then(
            () => undefined,
            (error: Error) => error,
          ),
        );
        expect(error?.message).toContain('guest bundle');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'T-5: a query is one bridge call and hydrates only its rows',
    Effect.fnUntraced(
      function* (_) {
        yield* Effect.forEach(
          Array.from({ length: 100 }, (_, index) => index),
          (index) =>
            Database.add(Obj.make(Task, { title: `task ${index}`, status: index % 4 === 0 ? 'open' : 'done' })),
        );
        yield* Database.flush();
        const session = yield* openSession();
        const before = session.stats();
        expect(
          yield* run(
            session,
            `const open = yield* Database.query(Filter.type(yield* Database.resolve('${TASK_DXN}'), { status: 'open' })).run;
             yield* print(open.length);`,
          ),
        ).toEqual('25');
        const after = session.stats();
        expect(after.host.query - before.host.query).toEqual(1);
        expect(after.host.load - before.host.load).toEqual(0);
        expect(after.guest.hydrated).toEqual(25);
        expect(after.host.write - before.host.write).toEqual(0);
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'seeded rows answer without a bridge call',
    Effect.fnUntraced(
      function* (_) {
        const { tasks } = yield* seedTasks();
        const session = yield* openSession();
        const { context } = yield* bindingsContext();
        yield* Effect.promise(() => session.seed(tasks.map(rowOf), context));
        const before = session.stats();
        expect(
          yield* run(session, `yield* print((yield* Database.resolve('${Obj.getURI(tasks[1])}')).title);`),
        ).toEqual('Fix the build');
        const after = session.stats();
        expect(after.host.load - before.host.load).toEqual(0);
        expect(after.host.query - before.host.query).toEqual(0);
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'T-6: a runaway loop is stopped and the session survives',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* openSession();
        yield* run(session, 'const survivor = 7;');
        const { context } = yield* bindingsContext();
        const result = yield* Effect.promise(() => session.evaluate('while (true) {}', context));
        expect(result.ok).toBe(false);
        expect(result.ok ? '' : result.message).toContain('budget');
        expect(yield* run(session, 'yield* print(survivor);')).toEqual('7');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
