//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, deus } = cliHarness('deus-restore-');

// A file of its own: the slowest CLI test, run in parallel with the others.
describe('deus CLI export restore', () => {
  // The specs live in the codebase (D99), so its export in git is where CI finds them: restoring it
  // must give the toolchain as `deus/` compiles it, and every spec document must hold.
  test('restores the codebase export, which matches deus/ and whose specs hold', { timeout: 360_000 }, ({ expect }) => {
    const restored = join(scratch, 'restored');
    expect(deus('init', '--empty', '--codebase', restored).code).toBe(0);
    const add = deus('add', join(root, 'codebase/code'), join(root, 'codebase/specs'), '--codebase', restored);
    expect(add.stderr).toBe('');
    expect(add.code).toBe(0);

    const self = join(scratch, 'export-self');
    expect(deus('init', '--empty', '--codebase', self).code).toBe(0);
    expect(deus('add', join(root, 'deus'), '--codebase', self).code).toBe(0);
    const hashes = (codebase: string): Map<string, string> =>
      new Map(
        JSON.parse(deus('ls', '--json', '--codebase', codebase).stdout).map((entry: { name: string; hash: string }) => [
          entry.name,
          entry.hash,
        ]),
      );
    const exported = hashes(restored);
    const stale = [...hashes(self)].filter(([name, hash]) => exported.get(name) !== hash).map(([name]) => name);
    expect(stale, 'run `deus export codebase` after changing deus/').toEqual([]);

    // JS.Spec's blocks compile with the js target, which copies $DEUS_HOME/platform/js/runtime.mjs.
    process.env.DEUS_HOME = root;
    const checked = deus('mdl', '--codebase', restored);
    expect(checked.stdout).toMatch(/ 0 failed, 0 unchecked/);
    expect(checked.code).toBe(0);
  });
});
