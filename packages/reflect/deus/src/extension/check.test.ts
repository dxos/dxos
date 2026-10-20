//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { lintMdl } from './check.ts';

const block = (body: string) => ['```mdl', body, '```', ''].join('\n');

const messages = (text: string) => lintMdl(text).map(({ message }) => message);

describe('mdl lint', () => {
  test('unknown block type', ({ expect }) => {
    expect(messages(block('widget W-1'))).toEqual([
      'Unknown block type "widget". Declare it in the Extensions table or define it with an `ext` block.',
    ]);
  });

  describe('decision', () => {
    test('user decision', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  date: 2026-10-20\n  by: user:a@b.org'))).toEqual([]);
    });

    test('agent decision with principal', ({ expect }) => {
      expect(
        messages(block('decision D-2: Use Y.\n  by: agent:claude-code  # ran the migration\n  for: user:bob')),
      ).toEqual([]);
    });

    test('ratified agent decision', ({ expect }) => {
      expect(
        messages(block('decision D-2: Use Y.\n  by: agent:claude-code\n  for: user:bob\n  ratified-by: user:bob')),
      ).toEqual([]);
    });

    test('missing decider', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  date: 2026-10-20'))).toEqual([
        'Decision is missing `by:` — name the user: or agent: that made it.',
      ]);
    });

    test('untyped decider', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: bob'))).toEqual([
        'Decision `by: bob` must be `user:<handle>` or `agent:<name>`.',
      ]);
    });

    test('agent decision without principal', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: agent:claude-code'))).toEqual([
        'Agent decision is missing `for:` — name the user: the agent acted for.',
      ]);
    });

    test('principal on a user decision', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: user:bob\n  for: user:alice'))).toEqual([
        '`for:` applies only to agent decisions.',
      ]);
    });

    test('agent cannot ratify', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: agent:a\n  for: agent:b\n  ratified-by: agent:c'))).toEqual([
        '`for: agent:b` must be `user:<handle>`.',
        '`ratified-by: agent:c` must be `user:<handle>`.',
      ]);
    });

    test('fields of a later block are not read', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: user:bob') + block('type T\n  for: x'))).toEqual([]);
    });
  });
});
