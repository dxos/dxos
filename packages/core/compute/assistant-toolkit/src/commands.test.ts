//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SlashCommand, parseTaskSelectors, resolveSlashCommand } from './commands.ts';

describe('parseTaskSelectors', () => {
  test('bare numbers are ordinals', ({ expect }) => {
    expect(parseTaskSelectors('1 3')).toEqual([{ ordinal: 1 }, { ordinal: 3 }]);
    expect(parseTaskSelectors('1,3')).toEqual([{ ordinal: 1 }, { ordinal: 3 }]);
  });

  test('a quoted run is one title, however many words it holds', ({ expect }) => {
    expect(parseTaskSelectors('"Draft release notes"')).toEqual([{ title: 'Draft release notes' }]);
    expect(parseTaskSelectors("'Draft release notes'")).toEqual([{ title: 'Draft release notes' }]);
  });

  test('a quoted number is a title, not an ordinal', ({ expect }) => {
    expect(parseTaskSelectors('"123"')).toEqual([{ title: '123' }]);
  });

  test('quoted and bare selectors mix', ({ expect }) => {
    expect(parseTaskSelectors('2 "Draft release notes" 5')).toEqual([
      { ordinal: 2 },
      { title: 'Draft release notes' },
      { ordinal: 5 },
    ]);
  });

  test('an unquoted word is a single-word title', ({ expect }) => {
    expect(parseTaskSelectors('Ship')).toEqual([{ title: 'Ship' }]);
  });

  test('empty input and empty quotes select nothing', ({ expect }) => {
    expect(parseTaskSelectors('')).toEqual([]);
    expect(parseTaskSelectors('   ')).toEqual([]);
    expect(parseTaskSelectors('""')).toEqual([]);
  });
});

describe('resolveSlashCommand', () => {
  const commands: SlashCommand[] = [
    { command: '/task:run', description: '', execute: async () => ({}) },
    { command: '/task:create', description: '', execute: async () => ({}) },
  ];

  test('matches a command and returns the rest as args', ({ expect }) => {
    const resolved = resolveSlashCommand('/task:run 1 2', commands);
    expect(resolved?.command.command).to.eq('/task:run');
    expect(resolved?.args).to.eq('1 2');
  });

  test('an unknown command falls through to the model', ({ expect }) => {
    expect(resolveSlashCommand('/nope 1', commands)).to.be.undefined;
    expect(resolveSlashCommand('what about /task:run?', commands)).to.be.undefined;
  });

  test('a command with no arguments resolves with empty args', ({ expect }) => {
    expect(resolveSlashCommand('/task:create', commands)?.args).to.eq('');
  });
});
