//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { resolveWithin } from './path-scope';

describe('resolveWithin', () => {
  let root: string;

  beforeAll(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-computer-scope-')));
    fs.mkdirSync(path.join(root, 'nested', 'deep'), { recursive: true });
    fs.symlinkSync(os.tmpdir(), path.join(root, 'escape-link'));
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('defaults to the root', ({ expect }) => {
    expect(resolveWithin(root)).to.eq(root);
    expect(resolveWithin(root, '')).to.eq(root);
  });

  test('resolves a subdirectory', ({ expect }) => {
    expect(resolveWithin(root, 'nested/deep')).to.eq(path.join(root, 'nested', 'deep'));
  });

  test('refuses a path outside the root', ({ expect }) => {
    expect(() => resolveWithin(root, '..')).to.throw(/outside/);
    expect(() => resolveWithin(root, '../..')).to.throw(/outside/);
  });

  test('refuses a symlink that leaves the root', ({ expect }) => {
    expect(() => resolveWithin(root, 'escape-link')).to.throw(/outside/);
  });

  test('refuses a directory that does not exist', ({ expect }) => {
    expect(() => resolveWithin(root, 'nope')).to.throw(/does not exist/);
  });
});
