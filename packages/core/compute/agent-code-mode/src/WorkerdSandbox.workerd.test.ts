//
// Copyright 2026 DXOS.org
//

// Runs INSIDE the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`, opted in with
// `workerd` in this package's vite config. That is the point rather than a detail: `WorkerdSandbox`
// loads the model's code through the `worker_loaders` binding, which exists in no other runtime,
// and the loaded isolate's outbound `fetch` is pinned to the worker under test — which the pool
// runs in THIS isolate, so the host handler a test registers is the one the sandbox answers
// through. Nothing here is simulated.
//
// The workspace behind the dialect is in-memory rather than ECHO: `@dxos/echo-client` cannot load
// in workerd at all (it crashes the isolate), which is the same constraint that forces the sandbox
// to marshal snapshots instead of rebuilding bindings on the far side. What is under test here is
// the isolate boundary and the call protocol across it; `WorkerSandbox.test.ts` covers a real
// database under Node.

import { env } from 'cloudflare:test';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import type { BindingsContext, Dialect } from './Dialect.ts';
import * as WorkerdSandbox from './WorkerdSandbox.ts';

const TASK = 'com.example.type.task';

type Row = { id: string; typename: string; [field: string]: unknown };

/** A workspace with the plain dialect's shape and none of its machinery. */
const makeWorkspace = () => {
  const rows = new Map<string, Row>();
  let next = 0;
  const scored: string[] = [];
  const printed: string[] = [];

  const bindings = {
    print: (...values: unknown[]) =>
      printed.push(values.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join(' ')),
    query: async (typename: string, props?: Record<string, unknown>) =>
      [...rows.values()].filter(
        (row) =>
          row.typename === typename && Object.entries(props ?? {}).every(([field, value]) => row[field] === value),
      ),
    make: async (typename: string, props: Record<string, unknown>) => {
      if (typename !== TASK) {
        throw new Error(`Unknown object type: ${typename}`);
      }
      return { id: `obj-${++next}`, typename, ...props } as Row;
    },
    add: async (row: Row) => {
      rows.set(row.id, row);
      return row;
    },
    remove: async (row: Row) => void rows.delete(row.id),
    flush: async () => {},
    update: (row: Row, mutator: (row: Row) => void) => mutator(row),
    ops: {
      score: async ({ title }: { title: string }) => {
        scored.push(title);
        return title.length;
      },
      /** Never answers, so an evaluation awaiting it is bounded only by the sandbox's own budget. */
      stall: () => new Promise<never>(() => {}),
    },
  };

  return { rows, scored, printed, bindings };
};

/** Hands the sandbox the workspace above; the dialect seam is what makes this substitutable. */
const dialectOver = (bindings: Record<string, unknown>): Dialect => ({
  name: 'plain',
  instructions: () => '',
  wrap: (code) => code,
  bindings: () => bindings,
});

const setup = () => {
  const workspace = makeWorkspace();
  const sandbox = WorkerdSandbox.make({
    loader: (env as any).LOADER,
    // The pool's own self-service binding: a real `Fetcher` back to the worker under test, which
    // is this isolate. A deployment passes a service binding to itself here.
    outbound: (env as any).__VITEST_POOL_WORKERS_SELF_SERVICE,
  });

  const evaluate = (code: string, timeout?: Duration.Input) =>
    // `EffectEx.runPromise`, which the rule asks for, is unusable here: importing `@dxos/effect`
    // crashes the workerd isolate outright, the same wall `@dxos/echo-client` hits. Nothing in
    // this file needs its span plumbing.
    // eslint-disable-next-line @dxos/rules/no-effect-run-promise
    Effect.runPromise(
      sandbox
        .evaluate({
          code,
          dialect: dialectOver(workspace.bindings),
          context: { runtime: undefined as any, operations: [], print: workspace.bindings.print } as BindingsContext,
          timeout,
        })
        .pipe(
          Effect.match({
            onSuccess: (value: unknown) => ({ value }) as { value?: unknown; failure?: string },
            onFailure: (error) => ({ failure: error.message }),
          }),
        ),
    );

  const run = async (code: string) => {
    workspace.printed.length = 0;
    const result = await evaluate(code);
    expect(result.failure).toBeUndefined();
    return workspace.printed.join('\n');
  };

  return { ...workspace, evaluate, run };
};

describe('workerd sandbox', () => {
  test('the isolate cannot reach the host runtime', async () => {
    const { run } = setup();
    // The property neither other sandbox has: `inProcess` compiles in the host realm and
    // `WorkerSandbox` shares the host's permissions. This is a Workers global scope.
    const output = await run(
      `print(JSON.stringify({ process: typeof process, require: typeof require, Buffer: typeof Buffer }));`,
    );
    expect(JSON.parse(output)).toEqual({ process: 'undefined', require: 'undefined', Buffer: 'undefined' });
  });

  test('reads and writes the host workspace from inside the isolate', async () => {
    const { rows, run } = setup();
    rows.set('a', { id: 'a', typename: TASK, title: 'Write the docs', status: 'open' });
    rows.set('b', { id: 'b', typename: TASK, title: 'Ship the release', status: 'done' });

    // The ordinary plain-dialect program: the mutator runs on the snapshot inside the isolate and
    // only the fields it changed travel home, so the model writes the same code it would anywhere.
    const output = await run(`
      const tasks = await query('${TASK}', { status: 'open' });
      for (const task of tasks) {
        update(task, (task) => { task.priority = task.title.length; });
      }
      await flush();
      print('updated: ' + tasks.length);
    `);
    expect(output).toEqual('updated: 1');

    // Applied to the HOST's own row, by id.
    expect(rows.get('a')!.priority).toEqual(14);
    expect(rows.get('b')!.priority).toBeUndefined();
  });

  test('creates an object and invokes an operation from inside the isolate', async () => {
    const { rows, scored, run } = setup();
    const output = await run(`
      const task = await make('${TASK}', { title: 'Review the PR', status: 'open' });
      await add(task);
      await flush();
      print('scored: ' + await ops.score({ title: task.title }));
    `);
    expect(output).toEqual('scored: 13');
    // The handler ran on the HOST, not in the isolate.
    expect(scored).toEqual(['Review the PR']);
    expect([...rows.values()].map((row) => row.title)).toEqual(['Review the PR']);
  });

  test('reports a throw in the isolate as output rather than failing the turn', async () => {
    const { evaluate } = setup();
    expect(await evaluate("throw new Error('boom');")).toEqual({ failure: 'boom' });
  });

  test('reports a call the host refuses', async () => {
    const { evaluate } = setup();
    // `ops` is a proxy, so an unbound name still reaches the host and is refused there rather than
    // being silently `undefined` in the isolate.
    expect(await evaluate("await ops['no-such-operation']({});")).toEqual({
      failure: 'Unknown operation: no-such-operation',
    });
  });

  test('refuses to resolve an object the host never handed out', async () => {
    const { evaluate } = setup();
    // The isolate only ever holds snapshots, so a forged id must not reach the workspace.
    expect(await evaluate(`await add({ id: 'forged', typename: '${TASK}' });`)).toEqual({
      failure: 'Unknown object: forged',
    });
  });

  test('an evaluation that never finishes is bounded, and by whichever bound is reached first', async () => {
    const { evaluate } = setup();
    // Two bounds exist and the runtime's is the tighter one: with nothing pending anywhere,
    // workerd detects a request that can never respond and cancels it in milliseconds, long before
    // the sandbox's own budget elapses. Asserting only the sandbox's message would be asserting a
    // path this runtime does not take, so what is pinned is the property that matters — the turn
    // comes back, with a failure, fast.
    const started = Date.now();
    const result = await evaluate('await ops.stall({});', '30 seconds');
    expect(result.failure).toBeDefined();
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});
