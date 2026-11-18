//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { checkStaleDist } from './stale-dist.ts';

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const touch = (path: string, seconds: number) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '');
  utimesSync(path, seconds, seconds);
};

const setup = (sourceSeconds: number, builtSeconds: number[]) => {
  const dir = mkdtempSync(join(tmpdir(), 'stale-dist-'));
  directories.push(dir);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@example/plugin' }));
  touch(join(dir, 'src', 'index.ts'), sourceSeconds);
  builtSeconds.forEach((seconds, index) => touch(join(dir, 'dist', 'lib', `chunk-${index}.mjs`), seconds));
  return dir;
};

describe('checkStaleDist', () => {
  test('passes when dist/lib is newer than src', ({ expect }) => {
    expect(checkStaleDist(setup(1_000, [2_000, 3_000]))).toBeUndefined();
  });

  test('fails with one line naming the package and the build command when src is newer', ({ expect }) => {
    const message = checkStaleDist(setup(2_500, [2_000, 3_000]));
    expect(message).toContain('@example/plugin');
    expect(message).toContain(':build');
    expect(message).not.toContain('\n');
  });

  test('passes a stale dist/lib with allowStale', ({ expect }) => {
    expect(checkStaleDist(setup(2_500, [2_000, 3_000]), { allowStale: true })).toBeUndefined();
  });

  test('ignores test files in src', ({ expect }) => {
    const dir = setup(1_000, [2_000]);
    touch(join(dir, 'src', 'a.test.ts'), 5_000);
    expect(checkStaleDist(dir)).toBeUndefined();
  });

  test('passes when there is no dist/lib', ({ expect }) => {
    expect(checkStaleDist(setup(1_000, []))).toBeUndefined();
  });
});
