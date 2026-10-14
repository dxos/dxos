//
// Copyright 2026 DXOS.org
//

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

const root = join(import.meta.dirname, '..');
const seed = readFileSync(SEED_PATH, 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'deus-cli-'));

/** Writes a source file into the scratch directory and returns its path. */
const file = (name: string, text: string) => {
  const path = join(scratch, name);
  writeFileSync(path, text);
  return path;
};

/** Runs the seed (the DEUS CLI) in-process. */
const deus = (...args: string[]) => {
  let stdout = '';
  let stderr = '';
  const { code } = runImage(seed, {
    args,
    stdout: (chunk) => {
      stdout += chunk;
    },
    stderr: (chunk) => {
      stderr += chunk;
    },
  });
  return { code, stdout, stderr };
};

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('deus CLI', () => {
  // Dogfooding: the toolchain's own sources go into a codebase, and its tests and theorems run there.
  test('adds the compiler to a codebase and passes its own tests and theorems', { timeout: 180_000 }, ({ expect }) => {
    const codebase = join(scratch, 'self');
    expect(deus('init', '--codebase', codebase).code).toBe(0);
    const add = deus('add', join(root, 'deus'), '--codebase', codebase);
    expect(add.stderr).toBe('');
    expect(add.code).toBe(0);
    const tests = deus('test', '--codebase', codebase);
    expect(tests.stdout).toMatch(/ 0 failed/);
    expect(tests.code).toBe(0);
    const theorems = deus('check', '--codebase', codebase);
    expect(theorems.stdout).toMatch(/proved by decide/);
    expect(theorems.code).toBe(0);
  });

  test('proves the sorting example and refuses unsound claims', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'proofs')];
    deus('init', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    expect(deus('add', join(root, 'examples/sort.deus'), join(root, 'examples/soundness.deus'), ...c).code).toBe(0);

    const sort = deus('check', 'Sort', '--json', ...c);
    const verdicts = Object.fromEntries(
      JSON.parse(sort.stdout).map((row: { name: string; status: string; evidence?: string }) => [row.name, row]),
    );
    for (const name of ['insertSorted', 'isortSorted', 'insertCount', 'isortCount', 'insertLength', 'isortLength']) {
      expect(verdicts[`Sort.${name}`]).toMatchObject({ status: 'pass', evidence: 'proof' });
    }
    expect(verdicts['Sort.agreesWithMergeSort']).toMatchObject({ status: 'pass', evidence: 'test' });
    expect(verdicts['Sort.wrongClaim'].status).toBe('fail');

    const probes = JSON.parse(deus('check', 'Unsound', '--json', ...c).stdout);
    for (const row of probes) {
      expect([row.name, row.status]).toEqual([row.name, row.name.startsWith('Unsound.right') ? 'pass' : 'fail']);
    }
  });

  test(
    'checks effect rows: a body may not perform what its signature leaves out',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'effects')];
      deus('init', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      const check = (name: string, body: string) => {
        const path = join(scratch, `${name}.deus`);
        writeFileSync(path, `namespace Rows\ndef ${name} (body : Unit -> {Throw Text | r} Int) : ${body}\nend Rows\n`);
        return deus('add', path, ...c);
      };
      // A handled `Throw` may be rethrown in a row that still has it.
      expect(
        check(
          'rethrows',
          '{Throw Text | r} Int :=\n  match try body with\n  | Result.ok x => x\n  | Result.err m => throw m',
        ).code,
      ).toBe(0);
      expect(
        check('handles', '{r} Int :=\n  match try body with\n  | Result.ok x => x\n  | Result.err _ => 0').code,
      ).toBe(0);
      // Leaking `Throw` into `{r}` is rejected, whether by a call or a throw.
      expect(check('leaksByCall', '{r} Int := body ()').stderr).toMatch(/ability mismatch/);
      expect(
        check('leaksByThrow', '{r} Int :=\n  match try body with\n  | Result.ok x => x\n  | Result.err m => throw m')
          .stderr,
      ).toMatch(/ability row r is declared as the caller's/);
      // Operators are typed: `::` binds tighter than `++` (as in Lean), so this appends a list to a text.
      expect(
        deus('add', file('ops.deus', 'def ops (h : Text) (xs : List Text) : List Text := h ++ "x" :: xs\n'), ...c)
          .stderr,
      ).toBe('deus: ops: type mismatch: Text vs List Text\n');
      expect(deus('add', file('cmp.deus', 'def cmp (a : Int) (b : Text) : Bool := a < b\n'), ...c).stderr).toBe(
        'deus: cmp: type mismatch: Int vs Text\n',
      );

      // A function stored in data keeps its effects (D55): fields are closed, and a row parameter carries them.
      const add = (name: string, source: string) => deus('add', file(`${name}.deus`, source), ...c);
      expect(
        add(
          'box',
          'structure Box (r : Effect) where\n  run : Unit -> {r} Int\nstructure Pure where\n  f : Int -> Int\n',
        ).code,
      ).toBe(0);
      expect(add('storeLeak', 'def storeLeak : Box {} := Box.mk (fun _ => throw "x")\n').stderr).toMatch(
        /unexpected ability Throw Text/,
      );
      expect(add('pureLeak', 'def pureLeak : Pure := Pure.mk (fun x => throw "no")\n').stderr).toMatch(
        /unhandled ability Throw Text/,
      );
      expect(add('runLeak', 'def runLeak (b : Box {Throw Text}) : {IO} Int := b.run ()\n').stderr).toMatch(
        /unhandled ability Throw Text/,
      );
      expect(
        add('matchLeak', 'def matchLeak (b : Box {Throw Text}) : {IO} Int := match b with\n  | Box.mk f => f ()\n')
          .stderr,
      ).toMatch(/unhandled ability Throw Text/);
      expect(add('runPoly', 'def runPoly (b : Box {r}) : {r} Int := b.run ()\n').code).toBe(0);
      expect(deus('view', 'runPoly', ...c).stdout).toContain('-- : Box {e} -> {e} Int');
    },
  );

  test('update propagates to dependents; branches merge three-way', { timeout: 120_000 }, ({ expect }) => {
    const codebase = join(scratch, 'demo');
    const c = ['--codebase', codebase];
    deus('init', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    deus(
      'add',
      file('a.deus', 'def double (n : Int) : Int := n * 2\ndef quad (n : Int) : Int := double (double n)\n'),
      ...c,
    );
    expect(deus('eval', 'quad 3', ...c).stdout.trim()).toBe('12');

    const update = deus(
      'update',
      file('b.deus', 'def double (n : Int) : Int := n + n + 1\n'),
      '--message',
      'off by one',
      ...c,
    );
    expect(update.stdout).toMatch(/\^ quad \(dependent, rehashed\)/);
    expect(deus('eval', 'quad 3', ...c).stdout.trim()).toBe('15');
    expect(deus('log', ...c).stdout).toMatch(/off by one/);

    deus('branch', 'feature', ...c);
    deus('add', file('c.deus', 'def triple (n : Int) : Int := n * 3\n'), ...c);
    deus('switch', 'main', ...c);
    deus('mv', 'quad', 'quadruple', ...c);
    const merge = deus('merge', 'feature', ...c);
    expect(merge.stdout).toMatch(/Merged feature/);
    expect(deus('eval', 'quadruple (triple 1)', ...c).stdout.trim()).toBe('15');

    const view = JSON.parse(deus('view', 'quadruple', '--json', ...c).stdout);
    expect(view[0].source).toContain('def quadruple (n : Int) : Int :=');
  });

  test(
    'checks performance requirements in an mdl document through a DEUS extension',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'mdl')];
      deus('init', ...c);
      deus(
        'add',
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        join(root, 'deus/sexp.deus'),
        join(root, 'deus/mdl.deus'),
        ...c,
      );
      expect(deus('add', join(root, 'examples/sort.deus'), join(root, 'platform/perf.deus'), ...c).code).toBe(0);

      const passing = deus('mdl', join(root, 'examples/perf.mdl'), '--json', ...c);
      expect(passing.code).toBe(0);
      expect(JSON.parse(passing.stdout).map((row: { status: string }) => row.status)).toEqual(['ok', 'ok', 'ok']);

      // Claiming linear growth for a quadratic sort, a budget it exceeds, and an undeclared block type.
      const doc = join(scratch, 'claims.mdl');
      writeFileSync(
        doc,
        [
          '## Extensions',
          '| Term | URI |',
          '| --- | --- |',
          '| `perf` | `org.dxos.deus.perf@1.0` |',
          '```mdl',
          'perf P-1',
          '  run: fun n => Sort.isort (List.reverse (List.range 0 n))',
          '  sizes: 20 | 40',
          '  order: n',
          '```',
          '```mdl',
          'perf P-2',
          '  run: Sort.isort (List.range 0 50)',
          '  budget: 10',
          '```',
          '```mdl',
          'todo',
          '```',
          '',
        ].join('\n'),
      );
      const failing = deus('mdl', doc, ...c);
      expect(failing.code).toBe(1);
      expect(failing.stdout).toContain('line 17: block type `todo` is not in the Extensions table');
      expect(failing.stdout).toContain('cost grew x3.72 from n=20 to n=40 (1378 -> 5138 steps); order n allows x2.50');
      expect(failing.stdout).toContain('took 508 steps; the budget is 10');
    },
  );

  test('files objects by layer, stores spec blocks, and records provenance', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'layers')];
    deus('init', ...c);
    deus(
      'add',
      join(root, 'deus/builtins.deus'),
      join(root, 'deus/prelude.deus'),
      join(root, 'deus/sexp.deus'),
      join(root, 'deus/mdl.deus'),
      ...c,
    );
    deus('add', join(root, 'examples/sort.deus'), join(root, 'platform/perf.deus'), ...c);
    const prompt = join(scratch, 'prompt.txt');
    writeFileSync(prompt, 'state the sort performance requirements\n');
    expect(deus('add', join(root, 'examples/perf.mdl'), '--by', 'agent-x', '--prompt', prompt, ...c).code).toBe(0);

    // With no files, `deus mdl` checks the specs the codebase names.
    const specs = deus('mdl', '--json', ...c);
    expect(JSON.parse(specs.stdout).map((row: { block: string; status: string }) => [row.block, row.status])).toEqual([
      ['Sort.Perf.P-1', 'ok'],
      ['Sort.Perf.P-2', 'ok'],
      ['Sort.Perf.P-3', 'ok'],
    ]);
    expect(deus('view', 'Sort.Perf.P-3', ...c).stdout).toContain('perf P-3: sorting ten numbers\n  run: Sort.isort');
    // Theorem verdicts go to the results layer.
    deus('check', ...c);

    const layers = Object.fromEntries(
      JSON.parse(deus('layers', '--json', ...c).stdout).map((row: { layer: string; entries: number }) => [
        row.layer,
        row.entries,
      ]),
    );
    expect([layers.spec, layers.proofs, layers.provenance, layers.cache]).toEqual([3, 8, 1, 0]);
    expect(layers.results).toBeGreaterThan(0);
    const log = JSON.parse(deus('log', '--json', '--n', '1', ...c).stdout);
    expect(log[0].by).toBe('agent-x');
  });

  test('projects pin libraries, infer their subgraph, and guard library IRIs', { timeout: 120_000 }, ({ expect }) => {
    const std = ['--codebase', join(scratch, 'std')];
    const app = ['--codebase', join(scratch, 'app')];
    deus('init', ...std);
    deus('project', 'init', 'https://dxos.org/deus/std', ...std);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...std);
    deus(
      'add',
      file(
        'shape.deus',
        'inductive Shape @"https://dxos.org/deus/std/Shape" where\n  | circle (r : Int)\ndef area (s : Shape) : Int := match s with\n  | Shape.circle r => 3 * r * r\n',
      ),
      ...std,
    );

    deus('init', ...app);
    deus('project', 'init', 'https://example.org/app', ...app);
    expect(deus('lib', 'install', 'std', join(scratch, 'std'), ...app).code).toBe(0);
    // Library names resolve by suffix, as in UCM.
    expect(deus('add', file('app.deus', 'def twice (n : Int) : Int := area (Shape.circle n) * 2\n'), ...app).code).toBe(
      0,
    );
    expect(deus('eval', 'twice 2', ...app).stdout).toBe('24\n');

    const info = JSON.parse(deus('project', '--json', ...app).stdout);
    expect([info.authority, info.owned, info.libs[0].iri]).toEqual(['example.org', 1, 'https://dxos.org/deus/std']);

    const minted = deus(
      'add',
      file('fake.deus', 'inductive Fake @"https://dxos.org/deus/std/Fake" where\n  | fake\n'),
      ...app,
    );
    expect(minted.code).toBe(1);
    expect(minted.stderr).toContain('Fake has IRI https://dxos.org/deus/std/Fake, which belongs to lib.std');
  });

  test(
    'replicates through immutable bundles, surfaces concurrent heads, and compacts deterministically',
    { timeout: 240_000 },
    ({ expect }) => {
      const remote = join(scratch, 'remote');
      const a = ['--codebase', join(scratch, 'replica-a')];
      const b = ['--codebase', join(scratch, 'replica-b')];
      for (const c of [a, b]) {
        deus('init', ...c);
        deus('remote', 'add', 'origin', remote, ...c);
      }
      // Fixed messages keep causal hashes, and so the strata boundaries, the same on every run.
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), '--message', 'prelude', ...a);
      expect(deus('push', ...a).stdout).toMatch(/^Pushed main to origin as 0-[0-9a-f]{64}\.\n$/);
      expect(deus('push', ...a).stdout).toBe('origin already has main.\n');
      deus('pull', ...b);
      expect(deus('merge', 'origin.main', ...b).stdout).toMatch(/^Fast-forwarded/);

      // Concurrent pushes to one branch leave two heads, merged like local branches.
      deus('add', file('x.deus', 'def x : Int := 1\n'), '--message', 'x', ...a);
      deus('push', ...a);
      deus('add', file('y.deus', 'def y : Int := 2\n'), '--message', 'y', ...b);
      deus('push', ...b);
      expect(deus('pull', ...a).stdout).toContain('2 heads (concurrent pushes)');
      deus('merge', 'origin.main', ...a);
      deus('merge', 'origin.main.2', ...a);

      // Enough history for level-1 boundaries (causal hashes starting with 0).
      for (let i = 1; i <= 70; i++) {
        deus('add', file('v.deus', `def v${i} : Int := ${i}\n`), '--message', `v${i}`, ...a);
        if (i % 10 === 0) {
          deus('push', ...a);
        }
      }
      const before = readdirSync(join(remote, 'bundles')).length;
      const first = JSON.parse(deus('compact', '--json', ...a).stdout);
      expect(first.written.length).toBeGreaterThan(0);
      expect(first.deleted.length).toBeGreaterThan(0);
      expect(readdirSync(join(remote, 'bundles')).length).toBeLessThan(before);
      // Strata come from hashes and bundles are canonical: another client's compaction writes nothing new.
      deus('pull', ...b);
      expect(JSON.parse(deus('compact', '--json', ...b).stdout)).toEqual({ written: [], deleted: [] });

      const fresh = ['--codebase', join(scratch, 'replica-c')];
      deus('init', ...fresh);
      deus('remote', 'add', 'origin', remote, ...fresh);
      deus('pull', ...fresh);
      deus('merge', 'origin.main', ...fresh);
      expect(deus('eval', 'v70 + v3 + x + y', ...fresh).stdout).toBe('76\n');

      // Retention: only recent generations survive, in one bundle; the history left is shallow.
      const collected = JSON.parse(deus('compact', '--keep', '3', '--json', ...a).stdout);
      expect(readdirSync(join(remote, 'bundles'))).toEqual([collected.bundle]);
      expect(collected.dropped).toBeGreaterThan(0);
      deus('pull', ...b);
      expect(JSON.parse(deus('compact', '--keep', '3', '--json', ...b).stdout)).toMatchObject({
        bundle: collected.bundle,
        deleted: [],
        dropped: 0,
      });
      const shallow = ['--codebase', join(scratch, 'replica-d')];
      deus('init', ...shallow);
      deus('remote', 'add', 'origin', remote, ...shallow);
      deus('pull', ...shallow);
      deus('merge', 'origin.main', ...shallow);
      expect(deus('eval', 'v70 + v3 + x + y', ...shallow).stdout).toBe('76\n');
    },
  );

  test('compiles first-order functions to wasm that agree with the interpreter', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'wasm')];
    deus('init', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const source = [
      'def gcd (a : Int) (b : Int) : Int := if b == 0 then a else gcd b (a % b)',
      'def sumTo (n : Int) (acc : Int) : Int := if n == 0 then acc else sumTo (n - 1) (acc + n)',
      'def collatz (n : Int) (steps : Int) : Int :=',
      '  let half := n / 2',
      '  if n == 1 then steps else if n % 2 == 0 then collatz half (steps + 1) else collatz (3 * n + 1) (steps + 1)',
      'def inRange (n : Int) : Bool := not (n < 2) && n != 9',
      'def shout (t : Text) : Text := t ++ "!"',
      '',
    ].join('\n');
    deus('add', file('nums.deus', source), ...c);
    const call = (name: string, ...args: number[]) => {
      const out = join(scratch, `${name}.wasm`);
      expect(deus('build', name, '-o', out, '--wasm', ...c).code).toBe(0);
      const exports = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(readFileSync(out)))).exports;
      const fn = exports[name];
      return typeof fn === 'function' ? fn(...args) : undefined;
    };
    // A million-deep recursion runs in constant stack (`return_call`) and wraps at 32 bits.
    for (const [name, args] of [
      ['gcd', [1071, 462]],
      ['sumTo', [1_000_000, 0]],
      ['collatz', [27, 0]],
    ] as const) {
      expect(String(call(name, ...args))).toBe(deus('eval', `${name} ${args.join(' ')}`, ...c).stdout.trim());
    }
    expect([call('inRange', 7), call('inRange', 9)]).toEqual([1, 0]);

    // Algebraic data (D56): the sorting example itself, with lists on the module's heap.
    deus('add', join(root, 'examples/sort.deus'), ...c);
    deus(
      'add',
      file(
        'lists.deus',
        [
          'def build (n : Int) : List Int := if n == 0 then [] else n :: build (n - 1)',
          'def total (xs : List Int) : Int := match xs with',
          '  | [] => 0',
          '  | x :: rest => x + total rest',
          'def sortedSum (n : Int) : Int := if Sort.sorted (Sort.isort (build n)) then total (Sort.isort (build n)) else 0 - 1',
          '',
        ].join('\n'),
      ),
      ...c,
    );
    expect(String(call('sortedSum', 300))).toBe(deus('eval', 'sortedSum 300', ...c).stdout.trim());

    const refused = deus('build', 'shout', '-o', join(scratch, 'shout.wasm'), '--wasm', ...c);
    expect([refused.code, refused.stderr]).toEqual([1, 'deus: the primitive append is outside the wasm subset\n']);
  });

  test('simulates Durable Objects that call each other and set alarms', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'cloudflare')];
    deus('init', ...c);
    const sources = [
      'deus/builtins.deus',
      'deus/prelude.deus',
      'platform/web.deus',
      'examples/counter.deus',
      'examples/tally.deus',
    ];
    expect(deus('add', ...sources.map((path) => join(root, path)), ...c).code).toBe(0);
    const tests = deus('test', '--json', ...c);
    expect(JSON.parse(tests.stdout).map((row: { name: string; status: string }) => [row.name, row.status])).toEqual([
      ['Counter.countsAcrossRequests', 'pass'],
      ['Tally.alarmsFireInOrder', 'pass'],
      ['Tally.objectsCallEachOther', 'pass'],
    ]);
  });

  // The first recipe in docs/GETTING_STARTED.md, as a reader would run it.
  test(
    'runs the getting-started tour and prints definitions with their effect rows',
    { timeout: 120_000 },
    ({ expect, onTestFinished }) => {
      const c = ['--codebase', join(scratch, 'tour')];
      // `deus run` hands every argument after the name to the program, so it finds the codebase in the environment.
      process.env.DEUS_CODEBASE = join(scratch, 'tour');
      onTestFinished(() => {
        delete process.env.DEUS_CODEBASE;
      });
      deus('init', ...c);
      deus(
        'add',
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        join(root, 'examples/tour.deus'),
        ...c,
      );
      expect(deus('test', 'Tour', ...c).stdout).toMatch(/3 passed, 0 failed/);
      expect(deus('run', 'Tour.main', '12', '-3', 'tea').stdout).toBe(
        '12 cups of tea cost 36\nerror: negative quantity -3\nerror: not a number: tea\n',
      );
      const view = deus('view', 'Tour.fromTable', 'Tour.total', ...c).stdout;
      expect(view).toContain('def Tour.fromTable (table : Map Text Int) (body : Unit -> {Prices | r} a) : {r} a :=');
      expect(view).toContain('def Tour.total (lines : List Line) : {Prices} Int :=');
      const unhandled = deus(
        'add',
        file('unhandled.deus', 'def oops (u : Unit) : {IO} Unit := println (Int.toText (Tour.total []))\n'),
        ...c,
      );
      expect(unhandled.stderr).toContain('unhandled ability Prices');
    },
  );

  test(
    'tracks tasks attached to definitions and changes, merged and replicated with the code',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'tasks')];
      deus('init', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      const shapes = file(
        'tasks-shapes.deus',
        'namespace Shapes\ndef square (side : Int) : Int := side * side\nend Shapes\n',
      );
      deus('add', shapes, ...c);
      type TaskRow = {
        id: string;
        title: string;
        state: string;
        priority: number;
        assignee: string;
        comments: { note: string }[];
      };
      const task = (...args: string[]): TaskRow => JSON.parse(deus('task', ...args, '--json', ...c).stdout);
      const bug = task(
        'new',
        'Square',
        'overflows',
        '--priority',
        'high',
        '--labels',
        'bug,math',
        '--link',
        'Shapes.square',
      );
      expect(bug).toMatchObject({ title: 'Square overflows', state: 'todo', priority: 2 });
      const docs = task('new', 'Document', 'shapes');
      task('set', bug.id, '--state', 'doing', '--assignee', 'agent-x');
      task('comment', bug.id, 'Use', 'a', 'checked', 'multiply.', '--by', 'agent-x');
      const listed = (...args: string[]): string[] =>
        JSON.parse(deus('task', 'list', ...args, '--json', ...c).stdout).map((row: TaskRow) => row.id);
      expect(listed('--about', 'Shapes.square')).toEqual([bug.id]);
      expect(listed()).toEqual([bug.id, docs.id]);

      // The change that fixes a task closes it and is linked from it.
      writeFileSync(shapes, 'namespace Shapes\ndef square (side : Int) : Int := side * side + 0\nend Shapes\n');
      const update = JSON.parse(deus('update', shapes, '--closes', bug.id.slice(0, 4), '--json', ...c).stdout);
      expect(listed()).toEqual([docs.id]);
      const shown = JSON.parse(deus('task', 'show', bug.id, '--json', ...c).stdout);
      expect(shown.task).toMatchObject({
        state: 'done',
        assignee: 'agent-x',
        comments: [{ author: 'agent-x', note: 'Use a checked multiply.' }],
      });
      expect(shown.links[0].current).not.toBe(shown.links[0].hash);
      expect(shown.links[0].changes[0].causal).toBe(update.causal);
      expect(shown.links[1]).toMatchObject({ change: update.causal });
      expect(shown.history.map((row: { message: string }) => row.message)).toEqual([
        `close ${bug.id} by #${update.causal.slice(0, 10)}`,
        `task: comment on ${bug.id}`,
        `task: set ${bug.id} state assignee`,
        `task: open ${bug.id} Square overflows`,
      ]);

      // Tasks merge field by field; a field changed differently on both sides is a conflict.
      deus('branch', 'side', ...c);
      deus('switch', 'side', ...c);
      task('set', docs.id, '--priority', 'low');
      task('comment', docs.id, 'from', 'side');
      deus('switch', 'main', ...c);
      task('set', docs.id, '--assignee', 'bob');
      task('comment', docs.id, 'from', 'main');
      expect(deus('merge', 'side', ...c).code).toBe(0);
      const merged = JSON.parse(deus('task', 'show', docs.id, '--json', ...c).stdout).task;
      expect(merged).toMatchObject({ priority: 4, assignee: 'bob' });
      expect(merged.comments.map((comment: { note: string }) => comment.note)).toEqual(['from main', 'from side']);
      deus('branch', 'rename', ...c);
      deus('switch', 'rename', ...c);
      task('set', docs.id, '--title', 'Doc A');
      deus('switch', 'main', ...c);
      task('set', docs.id, '--title', 'Doc B');
      expect(JSON.parse(deus('merge', 'rename', '--json', ...c).stdout).names).toEqual([`task:${docs.id}.title`]);

      // Tasks travel in bundles.
      const copy = ['--codebase', join(scratch, 'tasks-copy')];
      deus('remote', 'add', 'origin', join(scratch, 'tasks-remote'), ...c);
      deus('push', ...c);
      deus('init', ...copy);
      deus('remote', 'add', 'origin', join(scratch, 'tasks-remote'), ...copy);
      deus('pull', ...copy);
      deus('merge', 'origin.main', ...copy);
      expect(
        JSON.parse(deus('task', 'list', '--all', '--json', ...copy).stdout).map((row: TaskRow) => row.title),
      ).toEqual(['Doc B', 'Square overflows']);

      const site = join(scratch, 'tasks-site');
      deus('explore', '--out', site, ...c);
      expect(readFileSync(join(site, 'task', `${bug.id}.html`), 'utf8')).toContain('changed since linked');
      expect(readFileSync(join(site, 'index.html'), 'utf8')).toContain(`task/${docs.id}.html`);
    },
  );

  test('writes the codebase explorer and publishes it beside a remote', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'explore')];
    deus('init', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const shapes = [
      'namespace Shapes',
      'def square (side : Int) : Int := side * side',
      '/-- The area of a square. -/',
      'def area (side : Int) : Int := square side',
      'end Shapes',
    ];
    deus('add', file('shapes.deus', shapes.join('\n')), ...c);
    const out = join(scratch, 'explore-site');
    const written = deus('explore', '--out', out, '--json', ...c);
    expect(written.stderr).toBe('');
    expect(JSON.parse(written.stdout).pages).toBeGreaterThan(10);

    const names: { name: string; kind: string; hash: string }[] = JSON.parse(
      readFileSync(join(out, 'names.json'), 'utf8'),
    );
    const area = names.find((entry) => entry.name === 'Shapes.area');
    const square = names.find((entry) => entry.name === 'Shapes.square');
    const map = names.find((entry) => entry.name === 'List.map');
    expect(area?.kind).toBe('term');
    const page = readFileSync(join(out, 'def', `${area?.hash}.html`), 'utf8');
    expect(page).toContain('<span class=cm>/-- The area of a square. -/</span>');
    expect(page).toContain(`href="../def/${square?.hash}.html"`);
    expect(readFileSync(join(out, 'def', `${square?.hash}.html`), 'utf8')).toContain(
      `href="../def/${area?.hash}.html"`,
    );
    expect(readFileSync(join(out, 'ns', 'Shapes.html'), 'utf8')).toContain(`../def/${area?.hash}.html`);
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toContain('ns/List.html');
    expect(map?.kind).toBe('term');

    const remote = join(scratch, 'explore-remote');
    deus('remote', 'add', 'origin', remote, ...c);
    const published = JSON.parse(deus('explore', '--out', out, '--publish', 'origin', '--json', ...c).stdout);
    expect(published.files).toBe(readdirSync(join(out, 'def')).length + readdirSync(join(out, 'ns')).length + 3);
    expect(published.uploaded).toBe(published.files);
    expect(readFileSync(join(remote, 'site', 'def', `${area?.hash}.html`), 'utf8')).toBe(page);
    // Republishing sends only what changed.
    expect(JSON.parse(deus('explore', '--out', out, '--publish', 'origin', '--json', ...c).stdout).uploaded).toBe(0);
  });

  test(
    'serves web handlers from a standalone native server',
    { timeout: 240_000 },
    async ({ expect, onTestFinished }) => {
      process.env.DEUS_HOME = root;
      const c = ['--codebase', join(scratch, 'server')];
      deus('init', ...c);
      const sources = [
        'deus/builtins.deus',
        'deus/prelude.deus',
        'platform/web.deus',
        'examples/notes.deus',
        'examples/tally.deus',
      ];
      expect(deus('add', ...sources.map((path) => join(root, path)), ...c).code).toBe(0);
      const start = (handler: string) => {
        const binary = join(scratch, handler);
        expect(deus('build', handler, '-o', binary, '--server', ...c).code).toBe(0);
        const port = String(20_000 + Math.floor(Math.random() * 20_000));
        const server = spawn(binary, [], {
          env: { ...process.env, PORT: port, DEUS_DATA: join(scratch, `${handler}-data`) },
        });
        onTestFinished(() => {
          server.kill();
        });
        return `http://127.0.0.1:${port}`;
      };
      const request = async (url: string, init?: RequestInit) => {
        for (let attempt = 0; ; attempt++) {
          try {
            const response = await fetch(url, init);
            return [response.status, await response.text(), response.headers.get('content-type')] as const;
          } catch (err) {
            if (attempt > 50) {
              throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      };

      const notes = start('Notes.serve');
      expect(await request(`${notes}/notes/greet?actor=me`, { method: 'PUT', body: 'hello' })).toEqual([
        201,
        'stored greet',
        'text/plain; charset=utf-8',
      ]);
      expect(await request(`${notes}/notes/greet?actor=me`)).toEqual([200, 'hello', 'text/plain; charset=utf-8']);
      expect((await request(`${notes}/notes/greet?actor=you`))[0]).toBe(404);
      expect(await request(`${notes}/?actor=me`)).toEqual([
        200,
        '<!doctype html><title>Notes</title><h1>Notes</h1><ul><li><a href="/notes/greet">greet</a></li></ul>',
        'text/html; charset=utf-8',
      ]);

      // Objects call each other by name, and an alarm arrives later as a request.
      const tally = start('Tally.serve');
      expect((await request(`${tally}/add?actor=a`, { method: 'POST' }))[1]).toBe('count 1, total 1');
      expect((await request(`${tally}/add?actor=b`, { method: 'POST' }))[1]).toBe('count 1, total 2');
      expect((await request(`${tally}/remind?actor=c`, { method: 'POST' }))[1]).toBe('reminder set');
      let reminded = '';
      for (let i = 0; i < 40 && reminded !== 'yes'; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        reminded = (await request(`${tally}/reminded?actor=c`))[1];
      }
      expect(reminded).toBe('yes');
    },
  );

  test(
    'fetches a pinned tool by hash, caches it, and refuses a mismatch',
    { timeout: 120_000 },
    ({ expect, onTestFinished }) => {
      const c = ['--codebase', join(scratch, 'external')];
      deus('init', ...c);
      deus(
        'add',
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        join(root, 'deus/sexp.deus'),
        join(root, 'deus/mdl.deus'),
        join(root, 'deus/external.deus'),
        ...c,
      );
      const tool = join(scratch, 'tool.sh');
      writeFileSync(tool, '#!/bin/sh\necho "tool says $1"\n');
      chmodSync(tool, 0o755);
      const hash = createHash('sha256').update(readFileSync(tool)).digest('hex');
      const program = (name: string, sha: string) =>
        `def ${name} (u : Unit) : {IO, Fetch} Unit :=\n` +
        `  match External.tool (Requirement.mk External.url "file://${tool}" "1" "" "${sha}" "") ["hi"] with\n` +
        `  | Result.ok (_, out, _) => IO.print out\n` +
        `  | Result.err message => IO.print ("error: " ++ message)\n`;
      const source = join(scratch, 'fetch.deus');
      writeFileSync(source, program('good', hash) + program('bad', '0'.repeat(64)));
      const added = deus('add', source, ...c);
      expect(added.stderr).toBe('');
      expect(added.code).toBe(0);

      // `run` hands every argument after the name to the program, so the codebase comes from the environment.
      process.env.DEUS_CODEBASE = join(scratch, 'external');
      onTestFinished(() => {
        delete process.env.DEUS_CODEBASE;
      });
      expect(deus('run', 'good').stdout).toBe('tool says hi\n');
      // The second run is served from the cache: the source is gone.
      rmSync(tool);
      expect(deus('run', 'good').stdout).toBe('tool says hi\n');
      writeFileSync(tool, 'tampered\n');
      expect(deus('run', 'bad').stdout).toMatch(
        /^error: sha256 mismatch for file:\/\/.*: expected 0{64}, got [0-9a-f]{64}$/,
      );

      const doc = join(scratch, 'external.mdl');
      writeFileSync(
        doc,
        [
          '## Extensions',
          '| Term | URI |',
          '| --- | --- |',
          '| `requirement` | `org.dxos.deus.requirement@1.0` |',
          '| `container` | `org.dxos.deus.container@1.0` |',
          '```mdl',
          'requirement tool',
          '  registry: url',
          `  package: file://${tool}`,
          '  version: 1',
          `  sha256: ${hash}`,
          '```',
          '```mdl',
          'container db',
          '  image: postgres:16',
          '  ports: 5432:5432',
          '```',
          '',
        ].join('\n'),
      );
      const checked = deus('mdl', doc, '--json', ...c);
      expect(checked.code).toBe(1);
      expect(
        JSON.parse(checked.stdout).map((row: { status: string; problems: string[] }) => [row.status, row.problems]),
      ).toEqual([
        ['ok', []],
        ['fail', ['image: postgres:16 has no @sha256: digest; a tag alone may move']],
      ]);
    },
  );

  test('builds a standalone executable', { timeout: 180_000 }, ({ expect }) => {
    process.env.DEUS_HOME = root;
    process.env.DEUS_NODE = process.execPath;
    const c = ['--codebase', join(scratch, 'binary')];
    deus('init', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const source = join(scratch, 'hello.deus');
    writeFileSync(source, 'def main (u : Unit) : {IO} Unit := IO.print ("hello " ++ Text.join "," (IO.args ()))\n');
    deus('add', source, ...c);
    const binary = join(scratch, 'hello');
    const build = deus('build', 'main', '-o', binary, ...c);
    expect(build.stderr).toBe('');
    expect(build.code).toBe(0);
    const run = spawnSync(binary, ['a', 'b'], { cwd: tmpdir(), encoding: 'utf8' });
    expect([run.status, run.stdout]).toEqual([0, 'hello a,b']);
  });
});
