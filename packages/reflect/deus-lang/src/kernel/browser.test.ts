//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { type Files, runInBrowser } from './browser.ts';
import { sha256 } from './sha256.ts';

const home = join(import.meta.dirname, '../..');

/** The smallest `Files`: a map of path to text, every parent of a file a directory. */
const memory = (entries: Record<string, string>): Files => {
  const files = new Map(Object.entries(entries));
  const dirs = new Set<string>(['/']);
  const normalize = (path: string) =>
    '/' +
    path
      .split('/')
      .filter((part) => part && part !== '.')
      .join('/');
  const parents = (path: string) => {
    for (let index = path.lastIndexOf('/'); index > 0; index = path.lastIndexOf('/', index - 1)) {
      dirs.add(path.slice(0, index));
    }
  };
  [...files.keys()].forEach(parents);
  return {
    normalize,
    read: (path) => files.get(path),
    write: (path, text) => {
      parents(path);
      files.set(path, text);
    },
    exists: (path) => files.has(path) || dirs.has(path),
    isDir: (path) => dirs.has(path),
    mkdirp: (path) => parents(`${path}/x`),
    remove: (path) => {
      for (const key of [...files.keys()].filter((key) => key === path || key.startsWith(`${path}/`))) {
        files.delete(key);
      }
    },
    list: (path) => {
      const prefix = path === '/' ? '/' : `${path}/`;
      const names = [...files.keys(), ...dirs]
        .filter((key) => key.startsWith(prefix) && key.length > prefix.length)
        .map((key) => key.slice(prefix.length).split('/')[0]);
      return [...new Set(names)].sort();
    },
  };
};

describe('browser kernel', () => {
  test('sha256 matches node crypto on text with multi-byte characters', ({ expect }) => {
    for (const text of ['', 'abc', 'é😀'.repeat(40), 'x'.repeat(55), 'x'.repeat(64)]) {
      expect(sha256(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });

  test('the toolchain creates a codebase, adds a file and runs it from memory', { timeout: 60_000 }, ({ expect }) => {
    const fs = memory({
      '/deus/deus/builtins.deus': readFileSync(join(home, 'deus/builtins.deus'), 'utf8'),
      '/deus/deus/prelude.deus': readFileSync(join(home, 'deus/prelude.deus'), 'utf8'),
      '/work/hello.deus': 'namespace Hello\n\ndef main (u : Unit) : {IO} Unit := IO.print "hello\\n"\n',
    });
    const seed = readFileSync(join(home, 'seed/deus.image'), 'utf8');
    const cli = (...args: string[]) =>
      runInBrowser(seed, { fs, args, env: { DEUS_HOME: '/deus', DEUS_CODEBASE: '/codebase' }, cwd: '/work' });
    expect(cli('init').code).toBe(0);
    expect(cli('add', 'hello.deus').stdout).toMatch(/\+ Hello\.main/);
    expect(cli('run', 'Hello.main')).toMatchObject({ code: 0, stdout: 'hello\n', stderr: '' });
    expect(cli('eval', '6 * 7').stdout).toBe('42\n');
  });
});
