//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { limitsPrelude } from './limits.ts';
import { resolveSandboxPath } from './paths.ts';

describe('resolveSandboxPath', () => {
  const workspace = '/state/sandboxes/abc/workspace';

  test('maps /workspace paths onto the sandbox directory', ({ expect }) => {
    expect(resolveSandboxPath(workspace, '/workspace')).toBe(workspace);
    expect(resolveSandboxPath(workspace, '/workspace/src/a.txt')).toBe(`${workspace}/src/a.txt`);
  });

  test('resolves relative paths inside the workspace', ({ expect }) => {
    expect(resolveSandboxPath(workspace, 'a/b.txt')).toBe(`${workspace}/a/b.txt`);
    expect(resolveSandboxPath(workspace, 'a/../b.txt')).toBe(`${workspace}/b.txt`);
  });

  test('refuses host paths and escapes', ({ expect }) => {
    expect(() => resolveSandboxPath(workspace, '/etc/passwd')).toThrow(/outside the sandbox/);
    expect(() => resolveSandboxPath(workspace, '/workspacefoo')).toThrow(/outside the sandbox/);
    expect(() => resolveSandboxPath(workspace, '../x')).toThrow(/escapes/);
    expect(() => resolveSandboxPath(workspace, '/workspace/../../x')).toThrow(/escapes/);
  });
});

describe('limitsPrelude', () => {
  test('emits the limits the platform enforces', ({ expect }) => {
    expect(limitsPrelude({ cpuSeconds: 1.5, memoryMiB: 64, fileSizeMiB: 2 }, 'linux')).toEqual([
      'ulimit -S -t 2',
      'ulimit -H -t 3',
      'ulimit -d 65536',
      'ulimit -f 2048',
    ]);
  });

  test('leaves out the memory limit macOS ignores', ({ expect }) => {
    expect(limitsPrelude({ memoryMiB: 64 }, 'darwin')).toEqual([]);
  });
});
