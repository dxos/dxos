//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';
import { keptCliTest } from './kept-verdict.ts';

const { root, scratch, file, deus } = cliHarness('cli-dialect-');

const kept = keptCliTest(import.meta.filename);

// docs/spec/DIALECT-TS.md: what `deus view --dialect ts` prints, `deus update --dialect ts` reads back (task be4c4645).
describe('the TypeScript-like dialect', () => {
  test(
    'reads back what view prints, to the same hashes',
    { timeout: 240_000 },
    kept(({ expect }) => {
      // `init` finds the builtins and prelude through DEUS_HOME, as bin/deus.mjs sets it.
      process.env.DEUS_HOME = root;
      const c = ['--codebase', join(scratch, 'codebase')];
      expect(deus('init', ...c).code).toBe(0);
      expect(deus('add', join(root, 'examples/tour.deus'), join(root, 'examples/texts.deus'), ...c).code).toBe(0);
      const names = deus('ls', ...c)
        .stdout.split('\n')
        .map((line) => line.split(/\s+/))
        .filter(([name, kind]) => /^(Tour|Texts)\./.test(name ?? '') && (kind === 'term' || kind === 'test'))
        .map(([name]) => name ?? '');
      expect(names.length).toBeGreaterThan(20);
      const printed = names.map((name) => deus('view', name, '--dialect', 'ts', ...c).stdout).join('\n');
      expect(printed).toContain('switch (shape)');

      const same = deus('update', file('same.ts', printed), '--dialect', 'ts', ...c);
      expect(same.stderr).toBe('');
      expect(same.stdout.trim()).toBe('Nothing changed.');
      // The dialect prints no number spellings, and a definition it leaves unchanged keeps them.
      expect(deus('view', 'Texts.step', ...c).stdout).toContain('0x7FFFFFFF');

      const edited = deus(
        'update',
        file('edited.ts', printed.replace('return 3 * r * r;', 'return 4 * r * r;')),
        '--dialect',
        'ts',
        ...c,
      );
      expect(edited.stdout).toContain('~ Tour.area');
      expect(deus('eval', 'Tour.area (Shape.circle 1)', ...c).stdout.trim()).toBe('4');
    }),
  );

  test(
    'keeps rows, string literals and docs as written',
    { timeout: 240_000 },
    kept(({ expect }) => {
      process.env.DEUS_HOME = root;
      const c = ['--codebase', join(scratch, 'second')];
      expect(deus('init', ...c).code).toBe(0);
      const source = [
        'namespace R',
        '/-- An effect. -/',
        'ability Eff (e : Type) where',
        '  boom : e -> {IO} Unit',
        '/-- Doubles. -/',
        'def d (x : Int) : Int := x * 2',
        'def s : Text := "a #[ b */ c /** d"',
        'end R',
        '',
      ].join('\n');
      expect(deus('add', file('r.deus', source), ...c).code).toBe(0);
      const printed = ['R.Eff', 'R.d', 'R.s']
        .map((name) => deus('view', name, '--dialect', 'ts', ...c).stdout)
        .join('\n');
      expect(printed).toContain('/** An effect. */');
      expect(deus('update', file('r.ts', printed), '--dialect', 'ts', ...c).stdout.trim()).toBe('Nothing changed.');
      // A doc edited in the dialect lands, though the definition's hash does not change.
      expect(
        deus('update', file('r2.ts', printed.replace('Doubles.', 'Twice.')), '--dialect', 'ts', ...c).stdout,
      ).toContain('R.d (metadata)');
      expect(deus('view', 'R.d', ...c).stdout).toContain('/-- Twice. -/');
    }),
  );
});
