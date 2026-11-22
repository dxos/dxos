//
// Copyright 2026 DXOS.org
//

// The isolate is simulated in-process: the loader below evaluates the program module the sandbox writes, with its two
// imports supplied, and calls it as workerd would. Everything past the loader is real — the bridge, code mode's worker
// runtime, its ECHO client, the dialect's bindings and the host's services — so what this covers is the protocol across
// the boundary. The edge tests run the same sandbox in a real Worker Loader isolate.

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, expect, onTestFinished, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, SpaceId } from '@dxos/keys';

import { EffectDialect } from './dialect-effect.ts';
import { type SandboxOperation } from './Dialect.ts';
import { evaluate } from './eval-tool.ts';
import { serve } from './WorkerdEchoRuntime.ts';
import * as WorkerdEchoSandbox from './WorkerdEchoSandbox.ts';
import type * as WorkerSandbox from './WorkerSandbox.ts';

class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
  Schema.Struct({ title: Schema.String, status: Schema.String }),
) {}

const TASK_DXN = String(DXN.make('com.example.type.task', '0.1.0'));

/** Never registered with the peer: the host resolves it only through a type source. */
class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ text: Schema.String }),
) {}

const NOTE_DXN = String(DXN.make('com.example.type.note', '0.1.0'));

const Score = Operation.make({
  meta: { key: DXN.make('com.example.operation.score'), name: 'Score' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Number,
});

const ScoreOperation: SandboxOperation = {
  name: 'score',
  description: 'Scores a title',
  parameters: {},
  definition: Score,
  invoke: () => Effect.die(new Error('Reached through Operation.invoke, not the tool.')),
};

/** The turn's `Operation.Service`, which the isolate's `Operation.invoke` runs through on the host. */
const hostOperations: Operation.OperationService = {
  invoke: (op, ...[input]) =>
    String(op.meta.key) === String(Score.meta.key)
      ? Schema.decodeUnknownEffect(Score.input)(input).pipe(
          Effect.map(({ title }) => title.length),
          Effect.flatMap(Schema.decodeUnknownEffect(op.output)),
          Effect.orDie,
        )
      : Effect.die(new Error(`No handler: ${String(op.meta.key)}`)),
  schedule: () => Effect.die(new Error('not used')),
  invokePromise: () => Promise.resolve({ error: new Error('not used') }),
};

/**
 * The program module, run as workerd would run it: its imports are the two names it is given, and its default export is
 * the entrypoint the loader calls.
 */
const instantiate = (source: string): new () => WorkerdEchoSandbox.Entrypoint => {
  const body = source
    .replace(`import { WorkerEntrypoint } from 'cloudflare:workers';`, '')
    .replace(`import { serve } from './${WorkerdEchoSandbox.RUNTIME_MODULE}';`, '')
    .replace('export default class', 'return class');
  // The test's stand-in for module loading, which compiles the program as workerd would compile the module.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('WorkerEntrypoint', 'serve', body)(class {}, serve);
};

const setup = async () => {
  const builder = new EchoTestBuilder();
  await builder.open();
  onTestFinished(async () => void (await builder.close()));
  const peer = await builder.createPeer({ types: [Task] });
  const db = await peer.createDatabase();

  const loaded: WorkerdEchoSandbox.WorkerCode[] = [];
  const loader: WorkerdEchoSandbox.WorkerLoader = {
    get: (_id, load) => ({
      getEntrypoint: () => ({
        run: async (init, post, attach) => {
          const code = await load();
          loaded.push(code);
          const main = code.modules[code.mainModule];
          if (main === undefined || !('js' in main)) {
            throw new Error(`No program module: ${code.mainModule}`);
          }
          const Program = instantiate(main.js);
          return new Program().run(init, post, attach);
        },
      }),
    }),
  };

  let refreshes = 0;
  // A host's working set, as compute-service keeps one for a script's caller: what the isolate's database reports.
  const reports: Parameters<WorkerSandbox.WorkingSet['put']>[0][] = [];
  const sandbox = WorkerdEchoSandbox.make({
    loader,
    runtime: { modules: { [WorkerdEchoSandbox.RUNTIME_MODULE]: { js: '' } } },
    echo: () => ({ DataService: peer.host.dataService, QueryService: peer.host.queryService }),
    refresh: async () => {
      refreshes++;
    },
    workingSet: () => ({
      get: async () => ({ rows: [] }),
      put: async (report) => {
        reports.push(report);
      },
    }),
  });
  const runtime = Context.make(Database.Service, { db }).pipe(Context.add(Operation.Service, hostOperations));

  /** What the code printed, or its failure, as the model would read either. */
  const run = (code: string) =>
    EffectEx.runPromise(
      evaluate({ code, dialect: EffectDialect, sandbox, runtime, operations: [ScoreOperation] }).pipe(
        Effect.result,
        Effect.map((result) => (Result.isSuccess(result) ? result.success : result.failure)),
      ),
    );

  return { db, run, loaded, reports, refreshes: () => refreshes };
};

describe('workerd echo sandbox', () => {
  test('runs the Effect dialect against its own ECHO client, writing through to the host', async () => {
    const { db, run, refreshes } = await setup();
    db.add(Obj.make(Task, { title: 'Write the docs', status: 'open' }));
    db.add(Obj.make(Task, { title: 'Ship the release', status: 'done' }));
    await db.flush();

    const output = await run(`
      const Task = yield* Database.resolve('${TASK_DXN}');
      const open = yield* Database.query(Filter.type(Task, { status: 'open' })).run;
      Obj.update(open[0], (task) => { task.status = 'done'; });
      const created = yield* Database.add(Obj.make(Task, { title: 'Plan the launch', status: 'open' }));
      yield* Database.flush();
      yield* print('closed', open.length, 'created', created.title);
    `);
    expect(output).toEqual('closed 1 created Plan the launch');

    const tasks = await db.query(Filter.type(Task)).run();
    expect(tasks.map(({ title, status }) => `${title}: ${status}`).sort()).toEqual([
      'Plan the launch: open',
      'Ship the release: done',
      'Write the docs: done',
    ]);
    // No heads cross: the host refreshed its documents once the code had flushed.
    expect(refreshes()).toBeGreaterThan(0);
  });

  // The next call's database opens from the working set, so it reads what this script wrote before the index does.
  test("reports the code's writes to the host's working set", async () => {
    const { run, reports } = await setup();
    const output = await run(`
      const Task = yield* Database.resolve('${TASK_DXN}');
      const created = yield* Database.add(Obj.make(Task, { title: 'Remember me', status: 'open' }));
      yield* print(created.id);
    `);
    const rows = reports.flatMap(({ rows }) => rows);
    expect(rows.map(({ objectId }) => objectId)).toContain(output);
    expect(rows.find(({ objectId }) => objectId === output)?.objectJson).toContain('Remember me');
  });

  // As EDGE's published types reach a script: not registered, but resolved on demand by the host's type source.
  test('resolves a type the host serves from a type source rather than its registry', async () => {
    const { db, run } = await setup();
    const unregister = db.graph.registerTypeSource(async (uri) => (String(uri) === NOTE_DXN ? Note : undefined));
    onTestFinished(unregister);
    const output = await run(`
      const Note = yield* Database.resolve('${NOTE_DXN}');
      const note = yield* Database.add(Obj.make(Note, { text: 'resolved on demand' }));
      yield* print(Obj.getTypename(note), note.text);
    `);
    expect(output).toEqual('com.example.type.note resolved on demand');
  });

  test('invokes an operation on the host through Operation.invoke', async () => {
    const { run } = await setup();
    const output = await run(`
      const score = yield* Operation.invoke(yield* Database.resolve('${String(Score.meta.key)}'), { title: 'abc' });
      yield* print('score', score);
    `);
    expect(output).toEqual('score 3');
  });

  test('loads the program beside the runtime, in an isolate with no network and no bindings', async ({ expect }) => {
    const { run, loaded } = await setup();
    await run(`yield* print('hello');`);
    const [code] = loaded;
    expect(code.mainModule).not.toEqual(WorkerdEchoSandbox.RUNTIME_MODULE);
    expect(Object.keys(code.modules).sort()).toEqual([code.mainModule, WorkerdEchoSandbox.RUNTIME_MODULE].sort());
    expect(code.globalOutbound).toBeNull();
    expect(code.env).toEqual({});
    expect(code.compatibilityFlags).toEqual([...WorkerdEchoSandbox.COMPATIBILITY_FLAGS]);
  });

  test('reports code that does not compile as a failed evaluation', async () => {
    const { run } = await setup();
    const output = await run(`yield* print('never'); )(`);
    expect(output).toMatch(/^Error: The worker stopped without reporting a result: /);
  });

  test('refuses a query that names another space', async () => {
    const { run } = await setup();
    const other = SpaceId.random();
    const output = await run(`
      const everything = Query.select(Filter.everything());
      const elsewhere = Query.fromAst({
        type: 'from',
        query: everything.ast,
        from: { _tag: 'scope', scopes: [{ _tag: 'space', spaceId: '${other}' }] },
      });
      yield* Database.query(elsewhere).run;
      yield* print('read');
    `);
    expect(output).toContain(`Space ${other} is outside this sandbox`);
  });
});
