//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { isWritable, withinRoots } from './file-system.ts';

describe('file-system route', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'dx-fs-'));
  const root = path.join(base, 'checkout');
  const outside = path.join(base, 'outside');
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(path.join(outside, 'secret.mdl'), 'secret');
  symlinkSync(outside, path.join(root, 'escape'));

  afterAll(() => rmSync(base, { recursive: true, force: true }));

  test('a file inside a root resolves, including one that does not exist yet', ({ expect }) => {
    expect(withinRoots([root], path.join(root, 'docs/SPEC.mdl'))).toBe(path.join(root, 'docs/SPEC.mdl'));
    expect(withinRoots([root], path.join(root, 'new/dir/SPEC.mdl'))).toBe(path.join(root, 'new/dir/SPEC.mdl'));
  });

  test('`..`, absolute paths outside the roots and symlinks out of a root are refused', ({ expect }) => {
    expect(withinRoots([root], path.join(root, '../outside/secret.mdl'))).toBeUndefined();
    expect(withinRoots([root], path.join(outside, 'secret.mdl'))).toBeUndefined();
    expect(withinRoots([root], path.join(root, 'escape/secret.mdl'))).toBeUndefined();
    expect(withinRoots([root], path.join(root, 'escape/new.mdl'))).toBeUndefined();
  });

  test('only .mdl files are writable', ({ expect }) => {
    expect(isWritable('/r/PLUGIN.mdl')).toBe(true);
    expect(isWritable('/r/src/index.ts')).toBe(false);
  });
});
