//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { lstat, readlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import type * as RealPath from '@dxos/util/RealPath';

import * as FileSystem from './FileSystem.ts';

/** Node's equivalents of the desktop app's `fs_canonicalize` and `fs_read_link` commands. */
const resolver: RealPath.Resolver = {
  canonicalize: (file) => realpath(file).catch(() => undefined),
  readLink: async (file) => ((await lstat(file).catch(() => undefined))?.isSymbolicLink() ? readlink(file) : undefined),
};

/** A backend that records the paths it is asked for, standing in for the Tauri fs plugin. */
const recordingFileSystem = (): FileSystem.FileSystem & { calls: string[] } => {
  const calls: string[] = [];
  return {
    kind: 'tauri',
    calls,
    available: () => Effect.succeed(true),
    read: (file) =>
      Effect.sync(() => {
        calls.push(file);
        return readFileSync(file, 'utf8');
      }),
    write: (file) => Effect.sync(() => void calls.push(file)),
    remove: (file) => Effect.sync(() => void calls.push(file)),
    list: (dir) =>
      Effect.sync(() => {
        calls.push(dir);
        return [];
      }),
    roots: () => Effect.succeed([]),
  };
};

describe('FileSystem.within', () => {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'dx-fs-within-')));
  const root = path.join(base, 'checkout');
  const outside = path.join(base, 'outside');
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(path.join(root, 'docs/SPEC.mdl'), 'spec');
  writeFileSync(path.join(outside, 'secret.mdl'), 'secret');
  symlinkSync(outside, path.join(root, 'escape'));
  symlinkSync(path.join(outside, 'secret.mdl'), path.join(root, 'docs/secret.mdl'));
  symlinkSync(path.join(root, 'docs/SPEC.mdl'), path.join(root, 'alias.mdl'));

  afterAll(() => rmSync(base, { recursive: true, force: true }));

  test('refuses a symlink that escapes the roots before the backend sees it', async ({ expect }) => {
    const backend = recordingFileSystem();
    const fs = FileSystem.within(backend, [root], resolver);

    for (const refused of [
      fs.read(path.join(root, 'docs/secret.mdl')),
      fs.write(path.join(root, 'escape/new.mdl'), 'x'),
      fs.remove(path.join(root, 'escape/secret.mdl')),
      fs.list(path.join(root, 'escape')),
    ]) {
      expect(await EffectEx.runPromise(Effect.flip(refused))).toBeInstanceOf(FileSystem.FileSystemError);
    }
    expect(backend.calls).toEqual([]);
  });

  test('passes the real path of a link inside the roots to the backend', async ({ expect }) => {
    const backend = recordingFileSystem();
    const fs = FileSystem.within(backend, [root], resolver);

    expect(await EffectEx.runPromise(fs.read(path.join(root, 'alias.mdl')))).toBe('spec');
    expect(backend.calls).toEqual([path.join(root, 'docs/SPEC.mdl')]);
  });

  test('leaves the dev backend to its route, which applies the same check', ({ expect }) => {
    const backend: FileSystem.FileSystem = { ...recordingFileSystem(), kind: 'dev' };
    expect(FileSystem.within(backend, [root])).toBe(backend);
  });
});
