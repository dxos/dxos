//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { FREEZE_FILE, assertNotFrozen, readFreeze } from './freeze.ts';

describe('perf harness freeze', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'perf-freeze-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const freeze = (content: string) => {
    mkdirSync(path.join(root, '.perf'), { recursive: true });
    writeFileSync(path.join(root, FREEZE_FILE), content);
  };

  test('nothing frozen allows writes', ({ expect }) => {
    expect(readFreeze(root)).toBeUndefined();
    expect(() => assertNotFrozen(root, 'calibrate --write')).not.toThrow();
  });

  test('a frozen harness refuses writes and says how to thaw', ({ expect }) => {
    freeze(JSON.stringify({ hash: 'abc', paths: ['packages/e2e/perf-harness/src'], since: '2026-10-09T15:00:00Z' }));
    expect(readFreeze(root)?.hash).toBe('abc');
    expect(() => assertNotFrozen(root, 'calibrate --write')).toThrow(/pnpm perf thaw/);
  });

  test('a malformed freeze file is an error, not a silent thaw', ({ expect }) => {
    freeze('{"hash": 1}');
    expect(() => readFreeze(root)).toThrow(/malformed/);
  });
});
