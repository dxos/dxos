//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('cli-safety-');

/** Stores `text` as an object of the codebase at `dir`, as `Codebase.put` does, and returns its hash. */
const putObject = (dir: string, text: string) => {
  const hash = createHash('sha256').update(text).digest('hex');
  writeFileSync(join(dir, 'objects', hash.slice(0, 2), hash), `${text}\n`);
  return hash;
};

const objectText = (dir: string, hash: string) =>
  readFileSync(join(dir, 'objects', hash.slice(0, 2), hash), 'utf8').trim();

const headOf = (dir: string, branch = 'main') => readFileSync(join(dir, 'branches', branch), 'utf8').trim();

/** The namespace snapshot a history node points at. */
const snapshotOf = (dir: string, causal: string) => /\(ns "([0-9a-f]{64})"\)/.exec(objectText(dir, causal))?.[1] ?? '';

// DataSafety.Spec: names leave a branch only by a recorded deletion.
describe('deus CLI data safety', () => {
  test('a push never drops names silently; audit and restore find them', { timeout: 240_000 }, ({ expect }) => {
    const remote = join(scratch, 'remote');
    const aDir = join(scratch, 'a');
    const bDir = join(scratch, 'b');
    const a = ['--codebase', aDir];
    const b = ['--codebase', bDir];
    for (const c of [a, b]) {
      deus('init', '--empty', ...c);
      deus('remote', 'add', 'origin', remote, ...c);
    }
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), '--message', 'prelude', ...a);
    deus('add', file('x.deus', 'def Keep.x : Int := 1\n'), '--message', 'x', ...a);
    expect(deus('push', ...a).code).toBe(0);
    const withX = headOf(aDir);
    deus('add', file('y.deus', 'def Keep.y : Int := 2\ndef Gone.z : Int := 3\n'), '--message', 'y', ...a);
    expect(deus('push', ...a).code).toBe(0);
    const withY = headOf(aDir);

    // A merge node whose snapshot leaves out what one parent added: what a faulty merge writes.
    deus('pull', ...b);
    deus('merge', 'origin.main', ...b);
    const lossy = putObject(
      bDir,
      `(causal (ns "${snapshotOf(bDir, withX)}") (parents "${withY}" "${withX}") (msg "merge by a faulty deus"))`,
    );
    writeFileSync(join(bDir, 'branches', 'main'), `${lossy}\n`);

    const refused = deus('push', ...b);
    expect(refused.code).not.toBe(0);
    expect(refused.stderr).toContain(
      'this push would remove names from origin.main that no change in it deleted: Gone.z, Keep.y',
    );
    expect(deus('pull', ...a).stdout).toContain(withY.slice(0, 10));

    // `deus audit` names the merge and what it lost; it exits 1.
    const audited = deus('audit', '--json', ...b);
    expect(audited.code).toBe(1);
    expect(JSON.parse(audited.stdout).lost).toEqual([
      { causal: lossy, message: 'merge by a faulty deus', names: ['Gone.z', 'Keep.y'] },
    ]);

    // `deus heads` lists every head the remote claimed; `deus restore` adds back what one had.
    const heads = JSON.parse(deus('heads', '--json', ...b).stdout).map((row: { causal: string }) => row.causal);
    expect(heads.toSorted()).toEqual([withX, withY].toSorted());
    expect(JSON.parse(deus('restore', 'origin.main', '--names', 'Keep.y', '--json', ...b).stdout)).toMatchObject({
      from: withY,
      restored: ['Keep.y'],
    });
    expect(deus('push', ...b).stderr).toContain('no change in it deleted: Gone.z;');

    // A recorded deletion is a decision, so the push goes through.
    expect(deus('restore', 'origin.main', ...b).stdout).toContain('Restored 1 names from');
    expect(deus('rm', 'Gone.z', ...b).code).toBe(0);
    expect(deus('push', ...b).code).toBe(0);
    expect(JSON.parse(deus('audit', '--since', withY, '--json', ...b).stdout).deleted[0].names).toEqual(['Gone.z']);
  });

  test('merge refuses a CLI older than the codebase epoch', { timeout: 120_000 }, ({ expect }) => {
    const c = ['--codebase', join(scratch, 'epoch')];
    deus('init', '--empty', ...c);
    deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
    deus('add', file('one.deus', 'def one : Int := 1\n'), ...c);
    deus('branch', 'side', ...c);
    deus('add', file('epoch.deus', 'def Safety.epoch : Int := 1000\n'), ...c);
    deus('switch', 'main', ...c);
    const refused = deus('merge', 'side', ...c);
    expect(refused.code).not.toBe(0);
    expect(refused.stderr).toContain('asks for 1000 (Safety.epoch)');
  });
});
