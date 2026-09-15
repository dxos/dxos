//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildInstallCommand, buildRunCommand, shellQuote } from './harness-command.ts';

describe('harness command', () => {
  test('quotes a prompt so shell metacharacters are not executed', ({ expect }) => {
    expect(shellQuote('rm -rf / && echo $HOME')).toBe(`'rm -rf / && echo $HOME'`);
  });

  test('escapes embedded single quotes', ({ expect }) => {
    expect(shellQuote("it's fine")).toBe(`'it'\\''s fine'`);
  });

  test('run command puts the prompt last, after any extra args', ({ expect }) => {
    expect(buildRunCommand({ bin: 'deepseek', prompt: 'fix the build', args: ['--yes'] })).toBe(
      `deepseek '--yes' 'fix the build'`,
    );
  });

  test('install command quotes the package name', ({ expect }) => {
    expect(buildInstallCommand('deepseek-cli')).toBe(`npm install --global --no-fund --no-audit 'deepseek-cli'`);
  });
});
