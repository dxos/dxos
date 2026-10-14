//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  test('fetches a pinned tool by hash, caches it, and refuses a mismatch', { timeout: 120_000 }, ({ expect }) => {
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
    delete process.env.DEUS_CODEBASE;
  });

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
