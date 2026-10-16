//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('deus-cli-');

describe('deus CLI', () => {
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
        join(root, 'deus/time.deus'),
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
    // A primitive's type comes from the library's builtin, so `==` is still a Bool.
    expect(deus('eval', '1 == 1', ...app).stdout).toBe('true\n');

    // Installing a newer release moves the project's code onto it, as `update` moves dependents (D206).
    const area4 = 'def area (s : Shape) : Int := match s with\n  | Shape.circle r => 4 * r * r\n';
    deus('update', file('shape2.deus', area4), ...std);
    expect(deus('lib', 'install', 'std', join(scratch, 'std'), ...app).code).toBe(0);
    expect(deus('eval', 'twice 2', ...app).stdout).toBe('32\n');

    // The library's own source, updated into the project, stays the library's: deus/ holds both (D206).
    expect(deus('update', file('shape3.deus', area4), ...app).code).toBe(0);
    expect(JSON.parse(deus('project', '--json', ...app).stdout).owned).toBe(1);
    // A suffix the project and a library share names the project's; a library's root name, the library's.
    deus('update', file('size.deus', 'def Shape.size (s : Shape) : Int := 1\n'), ...std);
    expect(deus('lib', 'install', 'std', join(scratch, 'std'), ...app).code).toBe(0);
    deus('add', file('box.deus', 'def Box.size (n : Int) : Int := n\ndef Box.area (n : Int) : Int := n\n'), ...app);
    expect(deus('eval', 'size 5', ...app).stdout).toBe('5\n');
    expect(deus('eval', 'area (Shape.circle 1)', ...app).stdout).toBe('4\n');
    // Inside `Box`, a bare `area` is `Box.area`, so the library's prints in full and reads back the same.
    deus('add', file('use.deus', 'def Box.useArea (s : Shape) : Int := lib.std.area s\n'), ...app);
    const shown = deus('view', 'Box.useArea', ...app).stdout;
    expect(shown).toContain(':= lib.std.area s');
    expect(JSON.parse(deus('update', file('use2.deus', shown), '--json', ...app).stdout).updated).toEqual([]);
    // A name the project binds otherwise is the project's to edit, even to the library's definition.
    deus('add', file('own.deus', 'def area (s : Shape) : Int := 7\n'), ...app);
    expect(JSON.parse(deus('update', file('own2.deus', area4), '--json', ...app).stdout).updated).toHaveLength(1);
    expect(deus('eval', 'area (Shape.circle 1)', ...app).stdout).toBe('4\n');

    const info = JSON.parse(deus('project', '--json', ...app).stdout);
    expect([info.authority, info.libs[0].iri]).toEqual(['example.org', 'https://dxos.org/deus/std']);

    const minted = deus(
      'add',
      file('fake.deus', 'inductive Fake @"https://dxos.org/deus/std/Fake" where\n  | fake\n'),
      ...app,
    );
    expect(minted.code).toBe(1);
    expect(minted.stderr).toContain('Fake has IRI https://dxos.org/deus/std/Fake, which belongs to lib.std');
  });

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
      // An unknown field is refused, not ignored (task cb6c9a43).
      const unknown = deus('task', 'set', bug.id, '--status', 'done', ...c);
      expect(unknown.code).not.toBe(0);
      expect(unknown.stderr).toMatch(/unknown task field status; the fields are title, state/);
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

  test('simulates Durable Objects that call each other and set alarms', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'cloudflare')];
    deus('init', '--empty', ...c);
    const sources = [
      'deus/builtins.deus',
      'deus/prelude.deus',
      'deus/time.deus',
      'platform/web.deus',
      'examples/counter.deus',
      'examples/tally.deus',
    ];
    expect(deus('add', ...sources.map((path) => join(root, path)), ...c).code).toBe(0);
    const tests = deus('test', '--json', ...c);
    const rows: { name: string; status: string }[] = JSON.parse(tests.stdout);
    // `deus/time.deus` brings its own tests, which are not this one's subject.
    const examples = rows.filter((row) => /^(Counter|Tally)\./.test(row.name));
    expect(rows.every((row) => row.status === 'pass')).toBe(true);
    expect(examples.map((row) => [row.name, row.status])).toEqual([
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
      '',
      "def quoted (c : Int) : Bool := c == '\"' || c == 0x60 || c == 1_000",
    ].join('\n');
    deus('add', file('comments.deus', source), ...c);
    // Comments are metadata: the definition hashes as it does without them.
    const bare = ['--codebase', join(scratch, 'comments-bare')];
    deus('init', '--empty', ...bare);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...bare);
    const uncommented = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .replace(`'"'`, '34')
      .replace('0x60', '96')
      .replace('1_000', '1000');
    deus('add', file('uncommented.deus', uncommented), ...bare);
    expect(deus('names', 'area', '--json', ...bare).stdout).toBe(deus('names', 'area', '--json', ...c).stdout);
    // So are number spellings (D88): `'"'` hashes as `34`, and view prints it as written.
    expect(deus('names', 'quoted', '--json', ...bare).stdout).toBe(deus('names', 'quoted', '--json', ...c).stdout);
    expect(deus('view', 'quoted', ...c).stdout).toContain(`c == '"' || c == 0x60 || c == 1_000`);
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
    expect(text(first)).toContain(`c == '"' || c == 0x60`);
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
    // The explorer lists the imported changes too; one with no causal node here is marked and gets no page.
    process.env.DEUS_HOME = root;
    const restoredSite = join(scratch, 'comments-restored-site');
    expect(deus('explore', '--out', restoredSite, ...restored)).toMatchObject({ stderr: '', code: 0 });
    const shown: { message: string; imported?: boolean }[] = JSON.parse(
      readFileSync(join(restoredSite, 'meta.json'), 'utf8'),
    ).history;
    expect(shown.map((row) => row.message)).toEqual(after);
    expect(shown[0].imported).toBeUndefined();
    expect(shown.filter((row) => row.imported).length).toBeGreaterThan(0);
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
    // The app's three files, meta, names, tasks, comments, events and features, and one file per definition and per change.
    expect(published.files).toBe(readdirSync(join(out, 'def')).length + readdirSync(join(out, 'change')).length + 9);
    expect(published.uploaded).toBe(published.files);
    expect(readFileSync(join(remote, 'site', 'def', `${area?.hash}.json`), 'utf8')).toBe(page);
    // Republishing sends only what changed.
    expect(JSON.parse(deus('explore', '--out', out, '--publish', 'origin', '--json', ...c).stdout).uploaded).toBe(0);
    // A push to a remote that hosts the explorer refreshes it: the new definition's page and the indexes.
    deus('add', file('extra.deus', 'def Shapes.unit : Int := 1\n'), ...c);
    const pushed = JSON.parse(deus('push', 'origin', '--json', ...c).stdout);
    expect(pushed.site).toBeGreaterThanOrEqual(3);
    // The indexes land under the version that site/HEAD names, which is written last (D166).
    const version = readFileSync(join(remote, 'site', 'HEAD'), 'utf8');
    expect(readFileSync(join(remote, 'site', 'v', version, 'names.json'), 'utf8')).toContain('Shapes.unit');

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

  test(
    'a field is picked by its receiver once the definition is inferred, in any compile order',
    { timeout: 120_000 },
    ({ expect }) => {
      const c = ['--codebase', join(scratch, 'fields')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      const source = [
        'structure Box where',
        '  tasks : Int',
        '',
        'structure Crate where',
        '  tasks : Text',
        '',
        '-- The lambda meets `a.tasks` before its use fixes `a` to a Box (task 51938ccc).',
        'def sameTasks (xs : List Box) : Int :=',
        '  let same := fun a b => a.tasks == b.tasks',
        '  List.length (List.filter (fun x => same x x) xs)',
        '',
        'test pickedLate := sameTasks [Box.mk 1, Box.mk 2] == 2',
        '',
      ].join('\n');
      expect(deus('add', file('fields.deus', source), ...c).code).toBe(0);
      expect(JSON.parse(deus('test', 'pickedLate', '--json', ...c).stdout)).toMatchObject([
        { name: 'pickedLate', status: 'pass' },
      ]);
      // A receiver nothing ever fixes is still ambiguous, and says how to resolve it.
      const ambiguous = deus('add', file('ambiguous.deus', 'def tasksOf x := x.tasks\n'), ...c);
      expect(ambiguous.code).not.toBe(0);
      expect(ambiguous.stderr).toContain('ambiguous field tasks');
    },
  );

  test(
    'a theorem is checked again when the checker changes, a test is not (task 79f72c44)',
    { timeout: 120_000 },
    ({ expect, onTestFinished }) => {
      const c = ['--codebase', join(scratch, 'checker')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      deus('add', file('checker.deus', 'theorem plusZero : 1 + 0 == 1 := by rfl\ntest plusOne := 1 + 1 == 2\n'), ...c);
      const before = process.env.DEUS_IMAGE_HASH;
      onTestFinished(() => {
        process.env.DEUS_IMAGE_HASH = before;
      });
      const cached = (command: string, name: string) =>
        JSON.parse(deus(command, name, '--json', ...c).stdout)[0].cached;
      process.env.DEUS_IMAGE_HASH = 'aaaaaaaaaaaaaaaa1111';
      expect(cached('check', 'plusZero')).toBe(false);
      expect(cached('check', 'plusZero')).toBe(true);
      expect(cached('test', 'plusOne')).toBe(false);
      // Another toolchain: the theorem's kept verdict was another prover's, the test's is still its own.
      process.env.DEUS_IMAGE_HASH = 'bbbbbbbbbbbbbbbb2222';
      expect(cached('check', 'plusZero')).toBe(false);
      expect(cached('test', 'plusOne')).toBe(true);
    },
  );

  test('link prints the hosted explorer page of definitions and namespaces', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'links')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    deus('add', file('links.deus', 'def Shapes.square (side : Int) : Int := side * side\n'), ...c);
    expect(deus('link', 'Shapes', ...c).stderr).toContain('no project');
    deus('project', 'init', '@acme/shapes', ...c);
    // A remote that is a directory has no explorer, so the host must be given.
    deus('remote', 'add', 'origin', join(scratch, 'links-remote'), ...c);
    expect(deus('link', 'Shapes', ...c).stderr).toContain('pass --host');
    deus('remote', 'add', 'origin', 'https://deus.example.org/v1/@acme/shapes', ...c);
    expect(deus('link', ...c).stdout.trim()).toBe('https://deus.example.org/@acme/shapes/');
    expect(JSON.parse(deus('link', 'Shapes', 'square', '--json', ...c).stdout)).toEqual([
      { name: 'Shapes', url: 'https://deus.example.org/@acme/shapes/Shapes' },
      { name: 'Shapes.square', url: 'https://deus.example.org/@acme/shapes/Shapes.square' },
    ]);
    expect(deus('link', 'Shapes.square', '--host', 'localhost:8787', ...c).stdout.trim()).toBe(
      'https://localhost:8787/@acme/shapes/Shapes.square',
    );
    const unknown = deus('link', 'Circles', ...c);
    expect(unknown.code).not.toBe(0);
    expect(unknown.stderr).toContain('unknown name Circles');
  });
});
