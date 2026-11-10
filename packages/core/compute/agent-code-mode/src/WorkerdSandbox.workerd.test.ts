//
// Copyright 2026 DXOS.org
//

// Runs INSIDE the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`, opted in with
// `workerd` in this package's vite config. That is the point rather than a detail: `WorkerdSandbox`
// loads the model's code through the `worker_loaders` binding, which exists in no other runtime,
// and the loaded isolate calls back over Workers RPC into this test's invocation. Nothing here is
// simulated.
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

/** What the workspace's `ref` makes: a reference holding the row it names. */
type RowRef = { ref: Row };

/** A workspace with the plain dialect's shape and none of its machinery. */
const makeWorkspace = () => {
  const rows = new Map<string, Row>();
  let next = 0;
  const scored: string[] = [];
  const printed: string[] = [];
  /** Every value printed, as the host's printer received it. */
  const printedValues: unknown[] = [];
  /** The inputs operations were invoked with. */
  const inputs: unknown[] = [];
  const byId = (target: Row | string) => (typeof target === 'string' ? target : target.id);

  const bindings = {
    print: (...values: unknown[]) => {
      printedValues.push(...values);
      printed.push(values.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join(' '));
    },
    describe: async (row: Row) => `${row.typename} ${row.id} "${String(row.title)}"`,
    children: async (target: Row | string) => [...rows.values()].filter((row) => row.parent === byId(target)),
    relations: async (target: Row | string, direction: 'out' | 'in' = 'out') =>
      [...rows.values()].filter((row) => row[direction === 'out' ? 'source' : 'target'] === byId(target)),
    referrers: async (target: Row | string) =>
      [...rows.values()].filter((row) => (row.owner as RowRef | undefined)?.ref.id === byId(target)),
    ref: (row: Row): RowRef => ({ ref: row }),
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
      assign: async (input: { task: Row; owner: RowRef }) => {
        inputs.push(input);
        return { assigned: input.task.id };
      },
      /** Never answers, so an evaluation awaiting it is bounded only by the sandbox's own budget. */
      stall: () => new Promise<never>(() => {}),
    },
  };

  return { rows, scored, printed, printedValues, inputs, bindings };
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
  const sandbox = WorkerdSandbox.make({ loader: (env as any).LOADER });

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

  test('a ref and a held object reach the host as a reference and the live object', async () => {
    const { rows, inputs, run } = setup();
    rows.set('a', { id: 'a', typename: TASK, title: 'Write the docs' });
    rows.set('p', { id: 'p', typename: TASK, title: 'Person' });

    const output = await run(`
      const [task] = await query('${TASK}', { title: 'Write the docs' });
      const [person] = await query('${TASK}', { title: 'Person' });
      const review = await make('${TASK}', { title: 'Review', owner: ref(person) });
      await add(review);
      update(task, (task) => { task.owner = ref(person); });
      const result = await ops.assign({ task, owner: ref(person) });
      print(result.assigned);
    `);
    expect(output).toEqual('a');

    // `make` and `update` were handed the workspace's own reference, holding the live row.
    const review = [...rows.values()].find((row) => row.title === 'Review')!;
    expect((review.owner as RowRef).ref).toBe(rows.get('p'));
    expect((rows.get('a')!.owner as RowRef).ref).toBe(rows.get('p'));
    // The operation got the live task, not the snapshot the isolate held, and a reference for `owner`.
    const [input] = inputs as { task: Row; owner: RowRef }[];
    expect(input.task).toBe(rows.get('a'));
    expect(input.owner.ref).toBe(rows.get('p'));
  });

  test('prints a held object as the live object, and describes it', async () => {
    const { rows, printedValues, run } = setup();
    rows.set('a', { id: 'a', typename: TASK, title: 'Write the docs' });
    const output = await run(`
      const [task] = await query('${TASK}');
      print(task);
      print(await describe(task));
    `);
    expect(printedValues[0]).toBe(rows.get('a'));
    expect(output.split('\n')[1]).toEqual(`${TASK} a "Write the docs"`);
  });

  test("reads an object's children, relations and referrers, by object or by id", async () => {
    const { rows, run } = setup();
    rows.set('a', { id: 'a', typename: TASK, title: 'Parent' });
    rows.set('b', { id: 'b', typename: TASK, title: 'Child', parent: 'a' });
    rows.set('r', { id: 'r', typename: TASK, title: 'Link', source: 'a', target: 'b' });
    rows.set('c', { id: 'c', typename: TASK, title: 'Owned', owner: { ref: rows.get('a') } });
    const output = await run(`
      const [parent] = await query('${TASK}', { title: 'Parent' });
      const titles = (objects) => objects.map((obj) => obj.title).join(',');
      print(titles(await children(parent)), titles(await children('a')));
      print(titles(await relations(parent)), titles(await relations('b', 'in')));
      print(titles(await referrers(parent)));
    `);
    expect(output).toEqual(['Child Child', 'Link Link', 'Owned'].join('\n'));
  });

  test('an evaluation that never finishes is abandoned at its budget', async () => {
    const { evaluate } = setup();
    // The host's answer never comes, and nothing in the runtime can tell: the call is held open
    // on this side, so only the sandbox's own budget ends it.
    const started = Date.now();
    const result = await evaluate('await ops.stall({});', '1 second');
    expect(result.failure).toMatch(/did not finish within 1s; the isolate was abandoned/);
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});
