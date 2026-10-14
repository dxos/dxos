//
// Copyright 2026 DXOS.org
//

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
    expect(deus('init', '--empty', '--codebase', codebase).code).toBe(0);
    const add = deus('add', join(root, 'deus'), '--codebase', codebase);
    expect(add.stderr).toBe('');
    expect(add.code).toBe(0);
    const tests = deus('test', '--codebase', codebase);
    expect(tests.stdout).toMatch(/ 0 failed/);
    expect(tests.code).toBe(0);
    const theorems = deus('check', '--codebase', codebase);
    expect(theorems.stdout).toMatch(/proved by decide/);
    expect(theorems.code).toBe(0);

    // `view` prints source that compiles back to the same hashes: every definition, test, type and
    // ability of the toolchain, printed together so that mutually recursive ones are re-added as a group.
    const names: { name: string; kind: string; hash: string; sig: string; summary: string; status: string }[] =
      JSON.parse(deus('ls', '--json', '--codebase', codebase).stdout);
    const printed = names
      .filter((entry) => ['term', 'test', 'type', 'ability'].includes(entry.kind) && !entry.hash.startsWith('#'))
      .map((entry) => entry.name);
    expect(printed.length).toBeGreaterThan(1000);
    const source = deus('view', ...printed, '--codebase', codebase)
      .stdout.split('\n')
      .filter((line) => !line.startsWith('-- '))
      .join('\n');
    expect(deus('update', file('printed.deus', source), '--codebase', codebase).stdout).toBe('Nothing changed.\n');
  });

  test('proves the sorting example and refuses unsound claims', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'proofs')];
    deus('init', '--empty', ...c);
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
      deus('init', '--empty', ...c);
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
    deus('init', '--empty', ...c);
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
      deus('init', '--empty', ...c);
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

  test(
    'runs QA flows for a web app in simulation and reports the first failing step',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'qa')];
      deus('init', '--empty', ...c);
      deus(
        'add',
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        join(root, 'deus/sexp.deus'),
        join(root, 'deus/mdl.deus'),
        join(root, 'platform/web.deus'),
        join(root, 'platform/qa.deus'),
        join(root, 'examples/notes.deus'),
        ...c,
      );
      const passing = deus('mdl', join(root, 'examples/notes.mdl'), '--json', ...c);
      expect(JSON.parse(passing.stdout).map((row: { status: string }) => row.status)).toEqual(['ok', 'ok']);
      expect(passing.code).toBe(0);

      // A wrong expectation names the step and what the service answered; a malformed send is refused.
      const doc = file(
        'notes-wrong.mdl',
        readFileSync(join(root, 'examples/notes.mdl'), 'utf8')
          .replace('content == "hi there"', 'content == "bye"')
          .replace('send: DELETE /notes/draft', 'send: DELETE notes'),
      );
      const failing = deus('mdl', doc, ...c);
      expect(failing.code).toBe(1);
      expect(failing.stdout).toContain(
        "QA-1.3 (Follow the hello link; expect: The note's text is shown) failed: GET /notes/hello answered 200 hi there",
      );
      expect(failing.stdout).toContain('QA-2.2: send: DELETE notes is not VERB /path [payload]');
    },
  );

  test('files objects by layer, stores spec blocks, and records provenance', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'layers')];
    deus('init', '--empty', ...c);
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
    deus('init', '--empty', ...std);
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

    deus('init', '--empty', ...app);
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
        deus('init', '--empty', ...c);
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
      deus('init', '--empty', ...fresh);
      deus('remote', 'add', 'origin', remote, ...fresh);
      deus('pull', ...fresh);
      deus('merge', 'origin.main', ...fresh);
      expect(deus('eval', 'v70 + v3 + x + y', ...fresh).stdout).toBe('76\n');

      // Compaction never trims history: a clone of the compacted remote has every change, as git does.
      const history = (c: string[]) => deus('log', '--n', '1000', ...c).stdout;
      expect(history(fresh)).toBe(history(a));
      expect(history(a).split('\n').length).toBeGreaterThan(70);
      const refused = deus('compact', '--keep', '3', ...a);
      expect(refused.code).toBe(1);
      expect(refused.stderr).toContain('compact keeps the whole history');
    },
  );

  test(
    'migrates flat snapshots to namespace trees, links and provenance included',
    { timeout: 120_000 },
    ({ expect }) => {
      const dir = join(scratch, 'migrate');
      const c = ['--codebase', dir];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), ...c);
      deus(
        'add',
        file('m1.deus', 'def A.x : Int := 1\ndef A.y : Int := 2\ndef z : Int := 3\n'),
        '--message',
        'one',
        ...c,
      );
      const bug = JSON.parse(deus('task', 'new', 'Fix', 'x', '--link', 'A.x', '--json', ...c).stdout);
      deus('update', file('m1.deus', 'def A.x : Int := 10\n'), '--closes', bug.id, ...c);
      deus('add', file('m2.deus', 'def A.w : Int := 4\n'), '--message', 'two', '--by', 'agent-m', ...c);
      const head = readFileSync(join(dir, 'branches/main'), 'utf8').trim();

      // Rewrite history as an older codebase stored it: every snapshot one flat `ns` of full names.
      const path = (h: string) => join(dir, 'objects', h.slice(0, 2), h);
      const put = (text: string) => {
        const h = createHash('sha256').update(text.trimEnd()).digest('hex');
        mkdirSync(join(dir, 'objects', h.slice(0, 2)), { recursive: true });
        writeFileSync(path(h), text);
        return h;
      };
      const items = (h: string): string[] =>
        [
          ...readFileSync(path(h), 'utf8').matchAll(
            /\((n "[^"]*" \((?:[^()]|\([^()]*\))*\))\)|\(sub "([^"]*)" "([0-9a-f]{64})"\)|\(part "([0-9a-f]{64})"\)/g,
          ),
        ].flatMap((m) =>
          m[1] ? [m[1]] : m[2] ? items(m[3]).map((item) => item.replace(/^n "/, `n "${m[2]}.`)) : items(m[4]),
        );
      const moved = new Map<string, string>();
      const flatten = (h: string): string => {
        const text = readFileSync(path(h), 'utf8');
        const kind = text.slice(1, text.search(/[ )]/));
        if (!moved.has(h)) {
          moved.set(
            h,
            kind === 'ns'
              ? put(
                  `(ns${items(h)
                    .map((item) => ` (${item})`)
                    .join('')})\n`,
                )
              : ['causal', 'tasks', 'task'].includes(kind)
                ? put(text.replace(/[0-9a-f]{64}/g, (ref) => (existsSync(path(ref)) ? flatten(ref) : ref)))
                : h,
          );
        }
        return moved.get(h) ?? h;
      };
      writeFileSync(join(dir, 'branches/main'), `${flatten(head)}\n`);
      writeFileSync(join(dir, 'provenance', flatten(head)), readFileSync(join(dir, 'provenance', head)));
      rmSync(join(dir, 'provenance', head));
      expect(flatten(head)).not.toBe(head);
      const names = deus('ls', ...c).stdout;

      const migrated = JSON.parse(deus('migrate', '--json', ...c).stdout);
      expect(migrated).toEqual({ rewritten: 6, branches: 1 });
      // Tree snapshots are canonical, so the migrated history is exactly the one first written.
      expect(readFileSync(join(dir, 'branches/main'), 'utf8').trim()).toBe(head);
      expect(deus('ls', ...c).stdout).toBe(names);
      expect(JSON.parse(deus('migrate', '--json', ...c).stdout)).toEqual({ rewritten: 0, branches: 0 });
      expect(deus('eval', 'A.x + A.w + z', ...c).stdout).toBe('17\n');
      expect(JSON.parse(deus('log', '--json', '--n', '1', ...c).stdout)[0].by).toBe('agent-m');
      expect(JSON.parse(deus('task', 'show', bug.id, '--json', ...c).stdout).task.state).toBe('done');
    },
  );

  test('compiles first-order functions to wasm that agree with the interpreter', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'wasm')];
    deus('init', '--empty', ...c);
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

    // `==` on constructed values would compare addresses (D69): refused rather than answered wrong.
    deus('add', file('same.deus', 'def same (x : Int) : Bool := some x == some x\n'), ...c);
    const compared = deus('build', 'same', '-o', join(scratch, 'same.wasm'), '--wasm', ...c);
    expect(compared.code).toBe(1);
    expect(compared.stderr).toContain('eq on values that are not known to be Int or Bool is outside the wasm subset');
  });

  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'compiles first-order functions to C that agree with the interpreter',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'c')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      deus('add', join(root, 'examples/bench.deus'), ...c);
      // Mutual recursion, tail loops, data on the heap, nullary constructors and 32-bit wrapping.
      for (const [name, arg] of [
        ['Bench.fib', 20],
        ['Bench.collatz', 1000],
        ['Bench.trees', 2],
        ['Bench.queens', 6],
      ] as const) {
        const out = join(scratch, name);
        expect(deus('build', name, '-o', out, '--c', ...c).code).toBe(0);
        const run = spawnSync(out, [String(arg)], { encoding: 'utf8' });
        expect(run.stdout).toBe(deus('eval', `${name} ${arg}`, ...c).stdout);
      }
      deus('add', file('wrap.deus', 'def wrap (n : Int) : Int := n * 65536 * 65536 + n * 2147483647\n'), ...c);
      expect(deus('build', 'wrap', '-o', join(scratch, 'wrap'), '--c', ...c).code).toBe(0);
      expect(spawnSync(join(scratch, 'wrap'), ['3'], { encoding: 'utf8' }).stdout).toBe(
        deus('eval', 'wrap 3', ...c).stdout,
      );

      // A self tail call is a jump, so a million-deep loop runs in constant stack.
      deus(
        'add',
        file('loop.deus', 'def loop (n : Int) (acc : Int) : Int := if n == 0 then acc else loop (n - 1) (acc + n)\n'),
        ...c,
      );
      expect(deus('build', 'loop', '-o', join(scratch, 'loop.c'), '--c', ...c).code).toBe(0);
      expect(readFileSync(join(scratch, 'loop.c'), 'utf8')).toContain('goto top;');

      const refused = deus('build', 'Text.length', '-o', join(scratch, 'length'), '--c', ...c);
      expect(refused.code).toBe(1);
    },
  );

  test('simulates Durable Objects that call each other and set alarms', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'cloudflare')];
    deus('init', '--empty', ...c);
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
      // `deus init` adds the builtins and prelude from the toolchain's sources, as the guide relies on.
      process.env.DEUS_HOME = root;
      expect(deus('init', ...c).stdout).toContain('with the builtins and prelude');
      deus('add', join(root, 'examples/tour.deus'), ...c);
      expect(deus('test', 'Tour', ...c).stdout).toMatch(/3 passed, 0 failed/);
      expect(deus('run', ...c, 'Tour.main', '--codebase', 'is', 'an', 'argument').stdout).toContain(
        'error: not a number: --codebase',
      );
      expect(deus('run', 'Tour.main', '12', '-3', 'tea').stdout).toBe(
        '12 cups of tea cost 36\nerror: negative quantity -3\nerror: not a number: tea\n',
      );
      const view = deus('view', 'Tour.fromTable', 'Tour.total', ...c).stdout;
      expect(view).toContain('def Tour.fromTable (table : Map Text Int) (body : Unit -> {Prices | r} a) : {r} a :=');
      expect(view).toContain('def Tour.total (lines : List Line) : {Prices} Int :=');
      // Locals keep the author's names, `_` stays `_`, and constructors keep their type.
      const main = deus('view', 'Tour.main', ...c).stdout;
      expect(main).toContain('match try (fun _ => parseQuantity arg) with');
      expect(main).toContain('| Result.ok n => ');
      expect(main).toContain('| Result.err message => println ("error: " ++ message)');
      expect(deus('view', 'Tour.area', ...c).stdout).toContain('| Shape.circle r => 3 * r * r');
      // Declarations keep the author's parameter and field names.
      expect(deus('view', 'Tour.Shape', ...c).stdout).toContain(
        '  | circle (radius : Int)\n  | rect (width : Int) (height : Int)',
      );
      expect(deus('view', 'Result', ...c).stdout).toContain('inductive Result e a where\n  | ok (value : a)');
      // The same definitions in the TypeScript-like dialect (D65).
      const ts = deus(
        'view',
        'Tour.fromTable',
        'Tour.area',
        'Tour.Shape',
        'Tour.Prices',
        '--dialect',
        'ts',
        ...c,
      ).stdout;
      expect(ts).toContain(
        'function Tour.fromTable<a, r>(table: Map<Text, Int>, body: (() => a uses Prices, ...r)): a uses ...r {\n  try {\n    return body();\n  } handle {\n    Prices.priceOf(item, resume) {',
      );
      expect(ts).toContain('  switch (shape) {\n    case Shape.circle(r):\n      return 3 * r * r;');
      expect(ts).toContain('type Tour.Shape =\n  | circle(radius: Int)\n  | rect(width: Int, height: Int);');
      expect(ts).toContain('ability Tour.Prices {\n  priceOf(Text): Int;\n}');
      expect(deus('view', 'Tour.area', '--dialect', 'cobol', ...c).stderr).toContain('unknown dialect cobol');
      const unhandled = deus(
        'add',
        file('unhandled.deus', 'def oops (u : Unit) : {IO} Unit := println (Int.toText (Tour.total []))\n'),
        ...c,
      );
      expect(unhandled.stderr).toContain('unhandled ability Prices (calling Tour.total)');
    },
  );

  test(
    'tracks tasks attached to definitions and changes, merged and replicated with the code',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'tasks')];
      deus('init', '--empty', ...c);
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
      expect(shown.history.find((row: { message: string }) => row.message.startsWith('task: comment'))).toMatchObject({
        by: 'agent-x',
      });
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
      deus('init', '--empty', ...copy);
      deus('remote', 'add', 'origin', join(scratch, 'tasks-remote'), ...copy);
      deus('pull', ...copy);
      deus('merge', 'origin.main', ...copy);
      expect(
        JSON.parse(deus('task', 'list', '--all', '--json', ...copy).stdout).map((row: TaskRow) => row.title),
      ).toEqual(['Doc B', 'Square overflows']);

      // The explorer's task board reads tasks.json: links resolved against the current names, and history.
      process.env.DEUS_HOME = root;
      const site = join(scratch, 'tasks-site');
      deus('explore', '--out', site, ...c);
      const board = JSON.parse(readFileSync(join(site, 'tasks.json'), 'utf8'));
      const shownBug = board.find((row: { id: string }) => row.id === bug.id);
      expect(shownBug.state).toBe('done');
      expect(shownBug.links[0].current).not.toBe(shownBug.links[0].hash);
      expect(shownBug.history).toHaveLength(4);
      expect(JSON.parse(readFileSync(join(site, 'meta.json'), 'utf8'))).toMatchObject({ tasks: 2, open: 1 });

      // An export restores the same names, hashes and tasks in an empty codebase.
      const exported = join(scratch, 'tasks-export');
      expect(JSON.parse(deus('export', exported, '--json', ...c).stdout)).toMatchObject({ tasks: 2 });
      const staleTasks = readFileSync(join(exported, 'tasks.sexp'), 'utf8');
      expect(readFileSync(join(exported, 'TASKS.md'), 'utf8')).toContain(`## Square overflows (\`${bug.id}\`)`);
      const restored = ['--codebase', join(scratch, 'tasks-restored')];
      deus('init', '--empty', ...restored);
      expect(deus('add', join(exported, 'code'), ...restored).code).toBe(0);
      expect(deus('task', 'import', join(exported, 'tasks.sexp'), ...restored).stdout).toBe('Imported 2 tasks.\n');
      const listing = (args: string[]) => JSON.parse(deus('ls', '--json', ...args).stdout);
      expect(listing(restored)).toEqual(listing(c));
      expect(deus('task', 'list', '--all', '--json', ...restored).stdout).toBe(
        deus('task', 'list', '--all', '--json', ...c).stdout,
      );

      // Two codebases exporting to one directory merge what the other wrote there (D79).
      deus('task', 'set', docs.id, '--state', 'done', '--json', ...restored);
      expect(deus('export', exported, ...restored).code).toBe(0);
      task('set', docs.id, '--assignee', 'carol');
      expect(deus('export', exported, ...c).code).toBe(0);
      expect(JSON.parse(deus('task', 'show', docs.id, '--json', ...c).stdout).task).toMatchObject({
        state: 'done',
        assignee: 'carol',
      });
      const history = readFileSync(join(exported, 'history.sexp'), 'utf8');
      expect(history).toContain(`task: set ${docs.id} state`);
      expect(history).toContain(`task: set ${docs.id} assignee`);
      expect(deus('export', exported, ...restored).code).toBe(0);
      expect(JSON.parse(deus('task', 'show', docs.id, '--json', ...restored).stdout).task).toMatchObject({
        state: 'done',
        assignee: 'carol',
      });

      // A writer that never merged leaves old versions and drops tasks; neither reverts or deletes anything.
      const tasksBefore = deus('task', 'list', '--all', '--json', ...c).stdout;
      writeFileSync(
        join(exported, 'tasks.sexp'),
        staleTasks
          .split('\n')
          .filter((line) => !line.includes(bug.id))
          .join('\n'),
      );
      expect(deus('export', exported, ...c).code).toBe(0);
      expect(deus('task', 'list', '--all', '--json', ...c).stdout).toBe(tasksBefore);
    },
  );

  test('keeps ordinary comments as metadata through view and export', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'comments')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const source = [
      '-- Shapes measured in whole units.',
      '',
      '-- Squares only, for now.',
      'def area (side : Int) : Int :=',
      '  -- Negative sides are measured as positive.',
      '  let s := if side < 0 then 0 - side else side',
      '  match s with',
      '  -- A point has no area.',
      '  | 0 => 0',
      '  | n => n * n',
      '',
      'def plain (side : Int) : Int := side * side',
    ].join('\n');
    deus('add', file('comments.deus', source), ...c);
    // Comments are metadata: the definition hashes as it does without them.
    const bare = ['--codebase', join(scratch, 'comments-bare')];
    deus('init', '--empty', ...bare);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...bare);
    const uncommented = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    deus('add', file('uncommented.deus', uncommented), ...bare);
    expect(deus('names', 'area', '--json', ...bare).stdout).toBe(deus('names', 'area', '--json', ...c).stdout);
    const viewed = deus('view', 'area', ...c).stdout;
    expect(viewed).toContain('-- Shapes measured in whole units.\n\n-- Squares only, for now.\ndef area');
    expect(viewed).toContain('  -- Negative sides are measured as positive.\n  let s :=');
    expect(viewed).toContain('-- A point has no area.');

    // An export restored into an empty codebase exports the same text again.
    const first = join(scratch, 'comments-export');
    deus('export', first, ...c);
    const restored = ['--codebase', join(scratch, 'comments-restored')];
    deus('init', '--empty', ...restored);
    expect(deus('add', join(first, 'code'), ...restored).code).toBe(0);
    const second = join(scratch, 'comments-export-2');
    deus('export', second, ...restored);
    const text = (dir: string) => readFileSync(join(dir, 'code', '_root.deus'), 'utf8');
    expect(text(second)).toBe(text(first));
    expect(text(first)).toContain('-- A point has no area.');
    const hashOf = (args: string[]) =>
      JSON.parse(deus('ls', '--json', ...args).stdout).find((row: { name: string }) => row.name === 'area').hash;
    expect(hashOf(restored)).toBe(hashOf(c));

    // A definition whose callee lost its name still exports as source the parser reads (D77).
    const orphan = ['--codebase', join(scratch, 'orphan')];
    deus('init', '--empty', ...orphan);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...orphan);
    deus(
      'add',
      file('orphan.deus', 'def helper (x : Int) : Int := x + 1\n\ndef user (x : Int) : Int := helper x * 2\n'),
      ...orphan,
    );
    deus('rm', 'helper', ...orphan);
    const orphanExport = join(scratch, 'orphan-export');
    deus('export', orphanExport, ...orphan);
    const orphanRestored = ['--codebase', join(scratch, 'orphan-restored')];
    deus('init', '--empty', ...orphanRestored);
    expect(deus('add', join(orphanExport, 'code'), ...orphanRestored).code).toBe(0);
    const userHash = (args: string[]) =>
      JSON.parse(deus('ls', '--json', ...args).stdout).find((row: { name: string }) => row.name === 'user').hash;
    expect(userHash(orphanRestored)).toBe(userHash(orphan));

    // The history comes back as a record under the restore's own changes.
    expect(deus('history', 'import', join(first, 'history.sexp'), ...restored).code).toBe(0);
    const messages = (args: string[]) =>
      JSON.parse(deus('log', '--n', '100', '--json', ...args).stdout).map((row: { message: string }) => row.message);
    const before = messages(c);
    const after = messages(restored);
    expect(after[0]).toMatch(/^history: import \d+ changes$/);
    expect(after.slice(-before.length)).toEqual(before);
    const third = join(scratch, 'comments-export-3');
    deus('export', third, ...restored);
    expect(readFileSync(join(third, 'HISTORY.md'), 'utf8')).toContain(
      readFileSync(join(first, 'HISTORY.md'), 'utf8').split('\n\n')[1],
    );
  });

  // The console is the toolchain itself on the wasm kernel: run here through the same files the page loads.
  test('explore --console runs deus against a snapshot of the codebase', { timeout: 300_000 }, async ({ expect }) => {
    const c = ['--codebase', join(scratch, 'console')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    deus(
      'add',
      file('console.deus', 'namespace Shapes\ndef square (side : Int) : Int := side * side\nend Shapes\n'),
      ...c,
    );
    process.env.DEUS_HOME = root;
    const out = join(scratch, 'console-site');
    expect(deus('explore', '--out', out, '--console', ...c)).toMatchObject({ stderr: '', code: 0 });
    const snapshot: Record<string, string> = JSON.parse(readFileSync(join(out, 'console', 'codebase.json'), 'utf8'));
    expect(Object.keys(snapshot)).toContain('HEAD');
    expect(Object.keys(snapshot).some((path) => path.startsWith('cache/'))).toBe(false);
    expect(JSON.parse(readFileSync(join(out, 'console', 'info.json'), 'utf8'))).toEqual({
      files: Object.keys(snapshot).length,
      branch: 'main',
    });

    const host = await import(join(out, 'console', 'host.mjs'));
    const wasm = Buffer.from(readFileSync(join(out, 'console', 'deus_kernel.wasm.b64'), 'utf8'), 'base64');
    const files = Object.fromEntries(Object.entries(snapshot).map(([path, text]) => [`/codebase/${path}`, text]));
    const page = await host.createDeus({
      wasm: new Uint8Array(wasm),
      fs: host.createFiles(files),
      env: { HOME: '/home', DEUS_HOME: '/deus', DEUS_CODEBASE: '/codebase' },
    });
    const image = readFileSync(join(out, 'console', 'deus.image'), 'utf8');
    expect(await page.run(image, { args: ['view', 'Shapes.square'], cwd: '/work' })).toMatchObject({
      code: 0,
      stdout: expect.stringContaining('side * side'),
    });
    expect(await page.run(image, { args: ['eval', 'Shapes.square 7'], cwd: '/work' })).toMatchObject({
      code: 0,
      stdout: '49\n',
    });

    // A site that has a console keeps it, refreshed with the codebase each push.
    deus('remote', 'add', 'origin', join(scratch, 'console-remote'), ...c);
    deus('explore', '--out', out, '--publish', 'origin', ...c);
    deus('add', file('console-more.deus', 'def Shapes.unit : Int := 1\n'), ...c);
    expect(deus('push', 'origin', ...c).code).toBe(0);
    const published = readFileSync(join(scratch, 'console-remote', 'site', 'console', 'codebase.json'), 'utf8');
    expect(Object.keys(JSON.parse(published)).length).toBeGreaterThan(Object.keys(snapshot).length);
  });

  test('writes the codebase explorer and publishes it beside a remote', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'explore')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    const shapes = [
      'namespace Shapes',
      'def square (side : Int) : Int := side * side',
      '/-- The area of a square. -/',
      'def area (side : Int) : Int := square side',
      'end Shapes',
    ];
    deus('add', file('shapes.deus', shapes.join('\n')), ...c);
    process.env.DEUS_HOME = root;
    const out = join(scratch, 'explore-site');
    const written = deus('explore', '--out', out, '--json', ...c);
    expect(written.stderr).toBe('');
    expect(JSON.parse(written.stdout).definitions).toBeGreaterThan(10);

    const names: { name: string; kind: string; hash: string }[] = JSON.parse(
      readFileSync(join(out, 'names.json'), 'utf8'),
    );
    const area = names.find((entry) => entry.name === 'Shapes.area');
    const square = names.find((entry) => entry.name === 'Shapes.square');
    const map = names.find((entry) => entry.name === 'List.map');
    expect(area).toMatchObject({ kind: 'term', sig: 'Int -> Int', summary: 'The area of a square.', status: '' });
    // Each definition is a JSON document: its source highlighted, with references opening their definitions.
    const page = readFileSync(join(out, 'def', `${area?.hash}.json`), 'utf8');
    const def = JSON.parse(page);
    expect(def.html).toContain('<span class=cm>/-- The area of a square. -/</span>');
    expect(def.html).toContain(`<a class=ref data-open="d:${square?.hash}">square</a>`);
    // Types named only in a signature count as dependencies, so a type's page lists what uses it.
    expect(def.deps).toEqual([
      { name: 'Int', hash: '#Int' },
      { name: 'Shapes.square', hash: square?.hash },
    ]);
    expect(JSON.parse(readFileSync(join(out, 'def', `${square?.hash}.json`), 'utf8')).users).toEqual([
      { name: 'Shapes.area', hash: area?.hash },
    ]);
    // A builtin's page is named without its `#`, which a URL path cannot carry.
    const int = JSON.parse(readFileSync(join(out, 'def', '_Int.json'), 'utf8'));
    expect(int.users).toContainEqual({ name: 'Shapes.area', hash: area?.hash });
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toContain('<script type="module" src="app.js">');
    // Each change in the history has a page with what it did.
    const latest = JSON.parse(readFileSync(join(out, 'meta.json'), 'utf8')).history[0].causal;
    const change = JSON.parse(readFileSync(join(out, 'change', `${latest}.json`), 'utf8'));
    expect(change.added.map((ref: { name: string }) => ref.name).sort()).toEqual(['Shapes.area', 'Shapes.square']);
    expect(map?.kind).toBe('term');

    const remote = join(scratch, 'explore-remote');
    deus('remote', 'add', 'origin', remote, ...c);
    const published = JSON.parse(deus('explore', '--out', out, '--publish', 'origin', '--json', ...c).stdout);
    // The app's three files, meta, names, tasks and comments, and one file per definition and per change.
    expect(published.files).toBe(readdirSync(join(out, 'def')).length + readdirSync(join(out, 'change')).length + 7);
    expect(published.uploaded).toBe(published.files);
    expect(readFileSync(join(remote, 'site', 'def', `${area?.hash}.json`), 'utf8')).toBe(page);
    // Republishing sends only what changed.
    expect(JSON.parse(deus('explore', '--out', out, '--publish', 'origin', '--json', ...c).stdout).uploaded).toBe(0);
    // A push to a remote that hosts the explorer refreshes it: the new definition's page and the indexes.
    deus('add', file('extra.deus', 'def Shapes.unit : Int := 1\n'), ...c);
    const pushed = JSON.parse(deus('push', 'origin', '--json', ...c).stdout);
    expect(pushed.site).toBeGreaterThanOrEqual(3);
    expect(readFileSync(join(remote, 'site', 'names.json'), 'utf8')).toContain('Shapes.unit');

    // A change that rebinds a name carries both sources, which the app shows as a diff.
    deus('update', file('square.deus', 'def Shapes.square (side : Int) : Int := side * side + 0\n'), ...c);
    deus('explore', '--out', out, ...c);
    const rebound = JSON.parse(readFileSync(join(out, 'meta.json'), 'utf8')).history[0].causal;
    const diff = JSON.parse(readFileSync(join(out, 'change', `${rebound}.json`), 'utf8'));
    expect(diff.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Shapes.square',
          before: expect.stringMatching(/side \* side$/),
          after: expect.stringMatching(/side \* side \+ 0$/),
        }),
      ]),
    );
  });

  test(
    'serves web handlers from a standalone native server',
    { timeout: 240_000 },
    async ({ expect, onTestFinished }) => {
      process.env.DEUS_HOME = root;
      const c = ['--codebase', join(scratch, 'server')];
      deus('init', '--empty', ...c);
      const sources = [
        'deus/builtins.deus',
        'deus/prelude.deus',
        'platform/web.deus',
        'examples/notes.deus',
        'examples/tally.deus',
      ];
      expect(deus('add', ...sources.map((path) => join(root, path)), ...c).code).toBe(0);
      // The server reports on stderr when it listens and when an alarm fires; the test waits on those lines.
      const start = async (handler: string) => {
        const binary = join(scratch, handler);
        expect(deus('build', handler, '-o', binary, '--server', ...c).code).toBe(0);
        const port = String(20_000 + Math.floor(Math.random() * 20_000));
        const server = spawn(binary, [], {
          env: { ...process.env, PORT: port, DEUS_DATA: join(scratch, `${handler}-data`) },
        });
        onTestFinished(() => {
          server.kill();
        });
        let log = '';
        const waiters: { line: string; resolve: () => void }[] = [];
        server.stderr.on('data', (chunk: Buffer) => {
          log += chunk.toString();
          for (const waiter of waiters.filter((waiter) => log.includes(waiter.line))) {
            waiters.splice(waiters.indexOf(waiter), 1);
            waiter.resolve();
          }
        });
        const logged = (line: string) =>
          new Promise<void>((resolve) => (log.includes(line) ? resolve() : waiters.push({ line, resolve })));
        await logged('serving on');
        return { url: `http://127.0.0.1:${port}`, logged };
      };
      const request = async (url: string, init?: RequestInit) => {
        const response = await fetch(url, init);
        return [response.status, await response.text(), response.headers.get('content-type')] as const;
      };

      const { url: notes } = await start('Notes.serve');
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
      const { url: tally, logged } = await start('Tally.serve');
      expect((await request(`${tally}/add?actor=a`, { method: 'POST' }))[1]).toBe('count 1, total 1');
      expect((await request(`${tally}/add?actor=b`, { method: 'POST' }))[1]).toBe('count 1, total 2');
      expect((await request(`${tally}/remind?actor=c`, { method: 'POST' }))[1]).toBe('reminder set');
      await logged('alarm fired for c');
      expect((await request(`${tally}/reminded?actor=c`))[1]).toBe('yes');
    },
  );

  test(
    'fetches a pinned tool by hash, caches it, and refuses a mismatch',
    { timeout: 120_000 },
    ({ expect, onTestFinished }) => {
      const c = ['--codebase', join(scratch, 'external')];
      deus('init', '--empty', ...c);
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
    deus('init', '--empty', ...c);
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
