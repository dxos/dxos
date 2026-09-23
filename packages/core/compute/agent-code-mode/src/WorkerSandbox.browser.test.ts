//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Duration from 'effect/Duration';
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
import type { SandboxOperation } from './Dialect.ts';
import { EVAL_TOOL_NAME, makeEvalToolkit } from './eval-tool.ts';
import * as WorkerSandbox from './WorkerSandbox.ts';
import * as WorkerSandboxBrowser from './WorkerSandboxBrowser.ts';

const TASK_TYPENAME = 'com.example.type.task';
const PERSON_TYPENAME = 'com.example.type.person';

class Person extends Type.makeObject<Person>(DXN.make(PERSON_TYPENAME, '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    status: Schema.String,
    priority: Schema.optional(Schema.Number),
    owner: Schema.optional(Ref.Ref(Person)),
  }),
) {}

const Score = Operation.make({
  meta: { key: DXN.make('com.example.operation.score'), name: 'Score' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

const scored: string[] = [];
const ScoreOperation: SandboxOperation = {
  name: 'score',
  description: 'Scores a title',
  parameters: {},
  definition: Score,
  invoke: (input: unknown) =>
    Effect.sync(() => {
      const title = Schema.decodeUnknownSync(Schema.Struct({ title: Schema.String }))(input).title;
      scored.push(title);
      return title.length;
    }),
};

const noAmbientOperations: Operation.OperationService = {
  invoke: () => Effect.die(new Error('not used')),
  schedule: () => Effect.die(new Error('not used')),
  invokePromise: () => Promise.resolve({ error: new Error('not used') }),
};

/**
 * The Effect dialect in a real Web Worker: the path Composer runs, where the model's code must not
 * share the page's realm. Built from source by the test's own bundler, as an app's would be.
 */
describe('worker sandbox in a Web Worker', () => {
  test('runs the Effect dialect against the host database', async () => {
    const { db, run } = await setup();
    db.add(Obj.make(Task, { title: 'Write the docs', status: 'open' }));
    await db.flush();

    const output = await run(`
      const tasks = yield* Database.query(Filter.type(types['${TASK_TYPENAME}'], { status: 'open' })).run;
      const owner = yield* Database.add(Obj.make(types['${PERSON_TYPENAME}'], { name: 'Ada' }));
      for (const task of tasks) {
        Obj.update(task, (task) => { task.priority = task.title.length; task.owner = Ref.make(owner); });
      }
      yield* Database.flush();
      yield* print('linked', tasks.length, typeof window, typeof localStorage);
    `);
    // No DOM and no `localStorage` in the model's realm: the point of moving it off the page.
    expect(output).toEqual('linked 1 undefined undefined');

    const [task] = await db.query(Filter.type(Task)).run();
    expect(task.priority).toEqual('Write the docs'.length);
    expect((await task.owner?.load())?.name).toEqual('Ada');
  }, 60_000);

  test('invokes a skill operation on the page', async () => {
    const { run } = await setup();
    scored.length = 0;
    const output = await run(
      `yield* print('scored', yield* Operation.invoke(ops['${String(Score.meta.key)}'], { title: 'Review the PR' }));`,
    );
    expect(output).toEqual('scored 13');
    expect(scored).toEqual(['Review the PR']);
  }, 60_000);

  test('kills a worker whose code never finishes', async () => {
    const { run } = await setup();
    expect(await run('while (true) {}', '2 seconds')).toContain('the worker was killed');
  }, 60_000);

  test('reports a worker that fails to load', async () => {
    const { runOn, echo } = await setup();
    // Without the load failure reaching the host, it would wait out its budget on a handshake that
    // never comes — so no timeout is given, and returning at all is part of the assertion.
    const broken = WorkerSandbox.make({
      echo,
      spawn: WorkerSandboxBrowser.spawn(
        () => new Worker(new URL('./no-such-entry.ts', import.meta.url), { type: 'module' }),
      ),
    });
    expect(await runOn(broken, 'yield* print("unreachable");')).toContain('The worker stopped without reporting');
  }, 60_000);
});

const setup = async () => {
  const builder = new EchoTestBuilder();
  await builder.open();
  onTestFinished(async () => void (await builder.close()));

  const peer = await builder.createPeer({ types: [Task, Person] });
  const db = await peer.createDatabase();

  const echo = () => ({ DataService: peer.host.dataService, QueryService: peer.host.queryService });
  const sandbox = WorkerSandbox.make({
    echo,
    spawn: WorkerSandboxBrowser.spawn(
      () => new Worker(new URL('./WorkerSandboxBrowserEntry.ts', import.meta.url), { type: 'module' }),
    ),
  });

  const runtime = Context.make(Database.Service, { db }).pipe(Context.add(Operation.Service, noAmbientOperations));

  const runOn = (target: typeof sandbox, code: string, timeout?: Duration.Input) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const toolkit = makeEvalToolkit({
          dialect: EffectDialect,
          sandbox: target,
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
        return Schema.decodeUnknownSync(Schema.Struct({ output: Schema.String }))(JSON.parse(String(result.result)))
          .output;
      }),
    );

  const run = (code: string, timeout?: Duration.Input) => runOn(sandbox, code, timeout);
  return { db, echo, run, runOn };
};
