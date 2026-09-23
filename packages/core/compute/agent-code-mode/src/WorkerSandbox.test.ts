//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, onTestFinished, test } from 'vitest';

import { callTool } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { PlainDialect } from './dialect-plain.ts';
import type { Dialect, SandboxOperation } from './Dialect.ts';
import { EVAL_TOOL_NAME, makeEvalToolkit } from './eval-tool.ts';
import type * as Sandbox from './Sandbox.ts';
import * as WorkerSandbox from './WorkerSandbox.ts';

const TASK_TYPENAME = 'com.example.type.task';
const PERSON_TYPENAME = 'com.example.type.person';

class Person extends Type.makeObject<Person>(DXN.make(PERSON_TYPENAME, '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
) {}

class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    status: Schema.String,
    priority: Schema.optional(Schema.Number),
    owner: Schema.optional(Ref.Ref(Person)),
  }),
) {}

/**
 * The worker runs the BUILT entry, not the source beside it: it imports `@dxos/echo-client` to be
 * an ECHO client of its own, which is far past what Node's type stripping can load.
 */
const BUILT_ENTRY = new URL('../dist/lib/WorkerSandboxEntry.mjs', import.meta.url);

const Score = Operation.make({
  meta: { key: DXN.make('com.example.operation.score'), name: 'Score' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

/** How the Effect dialect keys `ops`: by the operation's own DXN. */
const SCORE_KEY = String(Score.meta.key);

/** Stands in for a skill-bound tool. Its handler stays here, which is the point of the call home. */
const scored: string[] = [];
const ScoreOperation: SandboxOperation = {
  name: 'score',
  description: 'Scores a title',
  parameters: {},
  // Its definition, so the Effect dialect has a key to bind; the worker gets a stand-in for it.
  definition: Score,
  invoke: (input: unknown) =>
    Effect.sync(() => {
      const { title } = input as { title: string };
      scored.push(title);
      return title.length;
    }),
};

/**
 * Operations reach their handler through the dialect's binding, which carries the key home, so
 * nothing resolves one from the ambient service — least of all inside the worker.
 */
const noAmbientOperations: Operation.OperationService = {
  invoke: () => Effect.die(new Error('not used')),
  schedule: () => Effect.die(new Error('not used')),
  invokePromise: () => Promise.resolve({ error: new Error('not used') }),
};

describe('worker sandbox', () => {
  test('reads and writes the host database from another thread', async () => {
    const { db, run } = await setup();
    db.add(Obj.make(Task, { title: 'Write the docs', status: 'open' }));
    db.add(Obj.make(Task, { title: 'Ship the release', status: 'done' }));
    await db.flush();

    // A mutator, not a patch: the worker holds its own ECHO client, so these are live objects and
    // `update` is the ordinary one — nothing about this code knows it is running off-thread.
    const output = await run(`
      const tasks = await query('${TASK_TYPENAME}', { status: 'open' });
      for (const task of tasks) {
        update(task, (task) => { task.priority = task.title.length; });
      }
      await flush();
      print('updated:', tasks.length);
    `);
    expect(output).toEqual('updated: 1');

    // Read back on the host: the worker's writes landed on the host's own objects.
    const tasks = await db.query(Filter.type(Task)).run();
    expect(tasks.map((task) => [task.title, task.priority])).toEqual([
      ['Write the docs', 14],
      ['Ship the release', undefined],
    ]);
  }, 60_000);

  test('creates an object and invokes a skill operation from inside the worker', async () => {
    const { db, run } = await setup();
    scored.length = 0;

    const output = await run(`
      const task = await make('${TASK_TYPENAME}', { title: 'Review the PR', status: 'open' });
      await add(task);
      await flush();
      print('scored:', await ops.score({ title: task.title }));
    `);
    expect(output).toEqual('scored: 13');
    // The handler ran HERE, not in the worker.
    expect(scored).toEqual(['Review the PR']);

    const tasks = await db.query(Filter.type(Task)).run();
    expect(tasks.map((task) => task.title)).toEqual(['Review the PR']);
  }, 60_000);

  test('reports a throw in the worker as output rather than failing the turn', async () => {
    const { run } = await setup();
    expect(await run("throw new Error('boom');")).toEqual('Error: boom');
  }, 60_000);

  test('reports a setup failure instead of waiting out the budget', async () => {
    const { runWith } = await setup();
    // An unknown dialect fails in the worker BEFORE it can run anything. Without a report the host
    // would wait for the whole timeout and then blame one, so the message is the assertion.
    const output = await runWith({ ...PlainDialect, name: 'no-such-dialect' }, 'print("unreachable");');
    expect(output).toContain('Unknown dialect: no-such-dialect');
    expect(output).not.toContain('killed');
  }, 60_000);

  test('reports a worker that dies before the channel exists', async () => {
    // The entry module is missing, so the thread dies while loading it and never connects. The
    // host is waiting on a handshake that will never come, which is a hang unless the dead worker
    // is watched from BEFORE the channel opens — and a hang here costs the caller its whole
    // budget and then blames a timeout it never hit. CI found this the hard way, by running the
    // suite without the package's own build.
    const { runWithEntry } = await setup();
    const output = await runWithEntry(
      new URL('../dist/lib/no-such-entry.mjs', import.meta.url),
      'print("unreachable");',
    );
    expect(output).toContain('The worker stopped without reporting a result');
  }, 60_000);

  describe('effect dialect', () => {
    test('queries, updates and links objects from another thread', async () => {
      const { db, runWith } = await setup();
      db.add(Obj.make(Task, { title: 'Write the docs', status: 'open' }));
      db.add(Obj.make(Task, { title: 'Ship the release', status: 'done' }));
      await db.flush();

      // The repo's own ECHO API, run on the worker's client: live objects, `Obj.update`, and a
      // reference made there that the host must resolve to the object the worker created.
      const output = await runWith(
        EffectDialect,
        `
        const tasks = yield* Database.query(Filter.type(types['${TASK_TYPENAME}'], { status: 'open' })).run;
        const owner = yield* Database.add(Obj.make(types['${PERSON_TYPENAME}'], { name: 'Ada' }));
        for (const task of tasks) {
          Obj.update(task, (task) => { task.priority = task.title.length; task.owner = Ref.make(owner); });
        }
        yield* Database.flush();
        yield* print('linked', tasks.length);
      `,
      );
      expect(output).toEqual('linked 1');

      const [task] = await db.query(Filter.type(Task, { status: 'open' })).run();
      expect(task.priority).toEqual('Write the docs'.length);
      expect((await task.owner?.load())?.name).toEqual('Ada');
    }, 60_000);

    test('invokes a skill operation on the host through Operation.invoke', async () => {
      const { runWith } = await setup();
      scored.length = 0;

      const output = await runWith(
        EffectDialect,
        `yield* print('scored', yield* Operation.invoke(ops['${SCORE_KEY}'], { title: 'Review the PR' }));`,
      );
      expect(output).toEqual('scored 13');
      // The handler ran HERE: the worker only ever held a stand-in definition.
      expect(scored).toEqual(['Review the PR']);
    }, 60_000);

    test('reports a failing effect as output', async () => {
      const { runWith } = await setup();
      const output = await runWith(EffectDialect, "yield* Effect.fail(new Error('nope'));");
      expect(output).toContain('Error:');
      expect(output).toContain('nope');
    }, 60_000);

    test('kills a worker whose effect never finishes', async () => {
      const { runWith } = await setup();
      // Synchronous inside the generator, so nothing on the worker's thread can interrupt it.
      expect(await runWith(EffectDialect, 'while (true) {}', '2 seconds')).toContain('the worker was killed');
    }, 60_000);
  });

  test('kills a worker whose code never finishes', async () => {
    const { run } = await setup();
    // A synchronous loop: the case the in-process sandbox cannot even observe, let alone stop,
    // because it blocks the thread the timeout would have to fire on.
    expect(await run('while (true) {}', '2 seconds')).toContain('the worker was killed');
  }, 60_000);
});

const setup = async () => {
  const builder = new EchoTestBuilder();
  await builder.open();
  onTestFinished(async () => void (await builder.close()));

  const peer = await builder.createPeer({ types: [Task, Person] });
  const db = await peer.createDatabase();

  const makeSandbox = (entry: URL) =>
    WorkerSandbox.make({
      entry,
      echo: () => ({ DataService: peer.host.dataService, QueryService: peer.host.queryService }),
    });

  const sandbox = makeSandbox(BUILT_ENTRY);

  const runtime = Context.make(Database.Service, { db }).pipe(Context.add(Operation.Service, noAmbientOperations));

  /** Runs `code` in a worker exactly as a turn would, returning what it printed. */
  const run = (code: string, timeout?: Duration.Input) => runWith(PlainDialect, code, timeout);

  const runWith = (dialect: Dialect, code: string, timeout?: Duration.Input) => runOn(sandbox, dialect, code, timeout);

  /** Runs against a sandbox pointed at `entry`, for the cases where the entry itself is the subject. */
  const runWithEntry = (entry: URL, code: string) => runOn(makeSandbox(entry), PlainDialect, code);

  const runOn = (sandbox: Sandbox.Sandbox, dialect: Dialect, code: string, timeout?: Duration.Input) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const toolkit = makeEvalToolkit({
          dialect,
          sandbox,
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
      }),
    );

  return { db, run, runWith, runWithEntry };
};
