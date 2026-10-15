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
    // Feature maps link tasks by id (D118), so the restore brings the tasks too.
    expect(deus('task', 'import', join(root, 'codebase/tasks.sexp'), '--codebase', restored).code).toBe(0);

    // Compiling deus/ over the restore changes nothing exactly when the export matches deus/; it
    // costs one compile, where a second codebase built from deus/ to compare hashes cost two.
    const update = deus('update', join(root, 'deus'), '--codebase', restored);
    expect(update.stdout.trim(), 'run `deus export codebase` after changing deus/').toBe('Nothing changed.');

    // JS.Spec's blocks compile with the js target, which copies $DEUS_HOME/platform/js/runtime.mjs.
    process.env.DEUS_HOME = root;
    const checked = deus('mdl', '--codebase', restored);
    expect(checked.stdout).toMatch(/ 0 failed, 0 unchecked/);
    expect(checked.code).toBe(0);

    // The toolchain's own feature map prints, and no shipped feature has a problem.
    const maps = JSON.parse(deus('features', '--json', '--codebase', restored).stdout) as {
      document: string;
      features: { id: string; status: string; problems: string[] }[];
    }[];
    const toolchain = maps.find((map) => map.document === 'Toolchain.Features');
    expect(toolchain?.features.length).toBeGreaterThan(10);
    expect(toolchain?.features.filter((f) => f.status === 'shipped' && f.problems.length > 0)).toEqual([]);

    // Every law a spec document holds is cited by one of its blocks (D125), and every @[req] link names a requirement (D130).
    const coverage = JSON.parse(deus('mdl', '--coverage', '--json', '--codebase', restored).stdout) as {
      document: string;
      uncitedLaws: string[];
      danglingLinks: string[];
    }[];
    expect(coverage.map((c) => c.document)).toContain('Coverage.Spec');
    expect(coverage.filter((c) => c.uncitedLaws.length > 0)).toEqual([]);
    expect(coverage.filter((c) => c.danglingLinks.length > 0)).toEqual([]);
  });
});
