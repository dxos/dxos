//
// Copyright 2026 DXOS.org
//

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
  test('adds the compiler to a codebase and passes its own tests and theorems', ({ expect }) => {
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

  test('update propagates to dependents; branches merge three-way', ({ expect }) => {
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
});
