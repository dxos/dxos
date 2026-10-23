//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { lstat, readlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, test } from 'vitest';

import * as RealPath from './RealPath.ts';

/** Node's lookups, as the dev server supplies them. */
const resolver: RealPath.Resolver = {
  canonicalize: (file) => realpath(file).catch(() => undefined),
  readLink: async (file) => ((await lstat(file).catch(() => undefined))?.isSymbolicLink() ? readlink(file) : undefined),
};

describe('RealPath', () => {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'dx-real-path-')));
  const root = path.join(base, 'checkout');
  const outside = path.join(base, 'outside');
  mkdirSync(path.join(root, 'docs/nested'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(path.join(root, 'docs/SPEC.mdl'), 'spec');
  writeFileSync(path.join(outside, 'secret.mdl'), 'secret');
  symlinkSync(outside, path.join(root, 'escape'));
  symlinkSync(path.join(outside, 'secret.mdl'), path.join(root, 'docs/secret.mdl'));
  symlinkSync(path.join(outside, 'later.mdl'), path.join(root, 'dangling.mdl'));
  symlinkSync(path.join(root, 'docs/SPEC.mdl'), path.join(root, 'alias.mdl'));
  // `docs/up` resolves against `docs/nested`'s real directory: `docs/nested/..` is `docs`, inside the root.
  symlinkSync(path.join(root, 'docs/nested'), path.join(root, 'nested-link'));
  symlinkSync('../SPEC.mdl', path.join(root, 'docs/nested/up.mdl'));

  afterAll(() => rmSync(base, { recursive: true, force: true }));

  test('normalize removes `.`, `..` and repeated slashes', ({ expect }) => {
    expect(RealPath.normalize('/a//b/./c/../d')).toBe('/a/b/d');
    expect(RealPath.normalize('/../a')).toBe('/a');
    expect(RealPath.normalize('/')).toBe('/');
  });

  test('isWithin matches whole path segments', ({ expect }) => {
    expect(RealPath.isWithin('/r', '/r')).toBe(true);
    expect(RealPath.isWithin('/r', '/r/a')).toBe(true);
    expect(RealPath.isWithin('/r', '/rx/a')).toBe(false);
    expect(RealPath.isWithin('/', '/a')).toBe(true);
  });

  test('paths inside a root resolve, including ones that do not exist yet', async ({ expect }) => {
    expect(await RealPath.contain(resolver, [root], path.join(root, 'docs/SPEC.mdl'))).toBe(
      path.join(root, 'docs/SPEC.mdl'),
    );
    expect(await RealPath.contain(resolver, [root], path.join(root, 'new/dir/SPEC.mdl'))).toBe(
      path.join(root, 'new/dir/SPEC.mdl'),
    );
    expect(await RealPath.contain(resolver, [root], path.join(root, 'alias.mdl'))).toBe(
      path.join(root, 'docs/SPEC.mdl'),
    );
    expect(await RealPath.contain(resolver, [root], path.join(root, 'nested-link/up.mdl'))).toBe(
      path.join(root, 'docs/SPEC.mdl'),
    );
  });

  test('symlinks out of a root, `..` and relative paths are refused', async ({ expect }) => {
    for (const file of [
      path.join(root, 'escape/secret.mdl'),
      path.join(root, 'escape/new.mdl'),
      path.join(root, 'docs/secret.mdl'),
      path.join(root, 'dangling.mdl'),
      `${root}/../outside/secret.mdl`,
      path.join(outside, 'secret.mdl'),
      'docs/SPEC.mdl',
    ]) {
      expect(await RealPath.contain(resolver, [root], file), file).toBeUndefined();
    }
  });
});
