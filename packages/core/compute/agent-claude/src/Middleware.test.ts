//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

import * as Middleware from './Middleware.ts';

// Real directories, not fixed strings: `resolveCwd` resolves symlinks and rejects paths that do
// not exist, so the boundary can only be exercised against a live filesystem.
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-root-'));
const root = path.join(base, 'root');
const outside = path.join(base, 'outside');
fs.mkdirSync(path.join(root, 'nested', 'deeper'), { recursive: true });
fs.mkdirSync(outside);
// A sibling whose name merely extends the root must not pass a naive prefix check.
fs.mkdirSync(`${root}-sibling`);
// An in-root symlink pointing outside the root must not smuggle the target past the boundary.
fs.symlinkSync(outside, path.join(root, 'escape'));

afterAll(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

describe('resolveCwd', () => {
  test('defaults to the configured root', () => {
    expect(Middleware.resolveCwd(root)).to.eq(fs.realpathSync(root));
  });

  test('allows the root itself and its subdirectories', () => {
    expect(Middleware.resolveCwd(root, '.')).to.eq(fs.realpathSync(root));
    expect(Middleware.resolveCwd(root, 'nested')).to.eq(fs.realpathSync(path.join(root, 'nested')));
    expect(Middleware.resolveCwd(root, 'nested/deeper')).to.eq(fs.realpathSync(path.join(root, 'nested', 'deeper')));
  });

  test('refuses traversal out of the root', () => {
    expect(() => Middleware.resolveCwd(root, '..')).to.throw();
    expect(() => Middleware.resolveCwd(root, '../outside')).to.throw();
    expect(() => Middleware.resolveCwd(root, 'nested/../../outside')).to.throw();
  });

  test('refuses an absolute path outside the root', () => {
    expect(() => Middleware.resolveCwd(root, outside)).to.throw();
    expect(() => Middleware.resolveCwd(root, os.tmpdir())).to.throw();
  });

  test('refuses a sibling whose name merely extends the root', () => {
    expect(() => Middleware.resolveCwd(root, `${root}-sibling`)).to.throw();
  });

  test('refuses an in-root symlink that escapes the root', () => {
    expect(() => Middleware.resolveCwd(root, 'escape')).to.throw();
  });

  test('refuses a path that does not exist', () => {
    expect(() => Middleware.resolveCwd(root, 'missing')).to.throw();
  });

  test('accepts an absolute path that is inside the root', () => {
    expect(Middleware.resolveCwd(root, path.join(root, 'nested'))).to.eq(fs.realpathSync(path.join(root, 'nested')));
  });
});
