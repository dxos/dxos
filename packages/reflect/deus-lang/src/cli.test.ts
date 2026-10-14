//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

const root = join(import.meta.dirname, '..');
const seed = readFileSync(SEED_PATH, 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'deus-cli-'));

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
    const file = (name: string, text: string) => {
      const path = join(scratch, name);
      writeFileSync(path, text);
      return path;
    };
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
