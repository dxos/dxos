//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { sourcesHash, staleness } from './native.ts';

describe('staleness', () => {
  let crate: string;

  const write = (path: string, contents: string) => {
    const file = join(crate, path);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, contents);
  };

  beforeEach(() => {
    crate = mkdtempSync(join(tmpdir(), 'code-index-native-'));
    write('Cargo.toml', '[package]');
    write('src/lib.rs', 'mod store;');
    write('src/store/mod.rs', 'pub fn open() {}');
  });

  afterEach(() => rmSync(crate, { recursive: true, force: true }));

  test('an addon built from the sources on disk is current', ({ expect }) => {
    const built = sourcesHash(crate);
    expect(staleness({ sourcesHash: () => built ?? '' }, crate)).toBeUndefined();
  });

  test('a changed source, nested ones included, makes it stale', ({ expect }) => {
    const built = sourcesHash(crate);
    write('src/store/mod.rs', 'pub fn open_shared() {}');
    expect(staleness({ sourcesHash: () => built ?? '' }, crate)).toContain('built from other sources');
  });

  test('an addon from before the check is stale', ({ expect }) => {
    expect(staleness({}, crate)).toContain('predates the source check');
  });

  test('without the crate there is nothing to compare', ({ expect }) => {
    expect(staleness({}, join(crate, 'missing'))).toBeUndefined();
  });
});
