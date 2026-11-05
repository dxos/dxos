//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, test } from 'vitest';

import { packProfile, unpackProfile } from '../profile.ts';

describe('profile', () => {
  test('packs a data root under the fixture name and unpacks it into a new directory', ({ expect }) => {
    const work = mkdtempSync(join(tmpdir(), 'profile-test-'));
    try {
      const dataRoot = join(work, 'root');
      mkdirSync(join(dataRoot, 'nested'), { recursive: true });
      writeFileSync(join(dataRoot, 'sqlite.db'), 'db');
      writeFileSync(join(dataRoot, 'nested', 'file'), 'nested');

      const archive = packProfile(dataRoot, work, new Date('2026-11-05T12:34:56.789Z'));
      expect(basename(archive)).toBe('mail-canary-profile-20261105-123456.tgz');

      const unpacked = unpackProfile(archive);
      try {
        expect(unpacked).not.toBe(dataRoot);
        expect(readFileSync(join(unpacked, 'sqlite.db'), 'utf8')).toBe('db');
        expect(readFileSync(join(unpacked, 'nested', 'file'), 'utf8')).toBe('nested');
      } finally {
        rmSync(unpacked, { recursive: true, force: true });
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
