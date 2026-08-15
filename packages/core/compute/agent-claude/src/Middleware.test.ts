//
// Copyright 2026 DXOS.org
//

import * as path from 'node:path';
import { describe, expect, test } from 'vitest';

import * as Middleware from './Middleware';

const ROOT = path.resolve('/tmp/agent-root');

describe('resolveCwd', () => {
  test('defaults to the configured root', () => {
    expect(Middleware.resolveCwd(ROOT)).to.eq(ROOT);
  });

  test('allows the root itself and its subdirectories', () => {
    expect(Middleware.resolveCwd(ROOT, '.')).to.eq(ROOT);
    expect(Middleware.resolveCwd(ROOT, 'nested')).to.eq(path.join(ROOT, 'nested'));
    expect(Middleware.resolveCwd(ROOT, 'nested/deeper')).to.eq(path.join(ROOT, 'nested', 'deeper'));
  });

  test('refuses traversal out of the root', () => {
    expect(() => Middleware.resolveCwd(ROOT, '..')).to.throw();
    expect(() => Middleware.resolveCwd(ROOT, '../../etc')).to.throw();
    expect(() => Middleware.resolveCwd(ROOT, 'nested/../../elsewhere')).to.throw();
  });

  test('refuses an absolute path outside the root', () => {
    expect(() => Middleware.resolveCwd(ROOT, '/etc')).to.throw();
    expect(() => Middleware.resolveCwd(ROOT, path.resolve('/tmp'))).to.throw();
  });

  test('refuses a sibling whose name merely extends the root', () => {
    expect(() => Middleware.resolveCwd(ROOT, `${ROOT}-sibling`)).to.throw();
  });

  test('accepts an absolute path that is inside the root', () => {
    expect(Middleware.resolveCwd(ROOT, path.join(ROOT, 'nested'))).to.eq(path.join(ROOT, 'nested'));
  });
});
