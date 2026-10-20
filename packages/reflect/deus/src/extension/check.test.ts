//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MISSING_DECISION, checkChangelogChange, isTrivialEdit, lintMdl } from './check.ts';

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

    test('principal must be a user', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: agent:a\n  for: agent:b'))).toEqual([
        '`for: agent:b` must be `user:<handle>`.',
      ]);
    });

    test('unclosed block at the end of the text', ({ expect }) => {
      expect(messages('```mdl\ndecision D-1: Use X.\n  by: user:bob\n')).toEqual([]);
    });

    test('unclosed block does not read the next block', ({ expect }) => {
      expect(messages('```mdl\ndecision D-1: Use X.\n  by: user:bob\n' + block('type T\n  for: x'))).toEqual([]);
    });

    test('fields of a later block are not read', ({ expect }) => {
      expect(messages(block('decision D-1: Use X.\n  by: user:bob') + block('type T\n  for: x'))).toEqual([]);
    });
  });

  describe('changelog change', () => {
    const decision = (id: string, prose: string, extra = '') =>
      block(`decision ${id}: ${prose}\n  date: 2026-10-20\n  by: user:bob${extra}`);
    const spec = (body: string, ...entries: string[]) => `# Spec\n\n${body}\n\n## Changelog\n\n${entries.join('\n')}`;
    const d1 = decision('D-1', 'Use X.');
    const d2 = decision('D-2', 'Use Y.');

    test('body change with a new decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X and Y', d1, d2))).toEqual([]);
    });

    test('body change without a decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X and Y', d1))).toEqual([MISSING_DECISION]);
    });

    test('typo fix without a decision', ({ expect }) => {
      expect(checkChangelogChange(spec('The bord is drawn.', d1), spec('The board is  drawn.\n', d1))).toEqual([]);
    });

    test('spec without a changelog section', ({ expect }) => {
      expect(checkChangelogChange('# Spec\n\nX\n', '# Spec\n\nY\n')).toEqual([MISSING_DECISION]);
    });

    test('adding a changelog to an existing spec', ({ expect }) => {
      expect(checkChangelogChange('# Spec\n\nX\n', spec('Y', d1))).toEqual([]);
    });

    test('decision only, such as an approval', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X', d1, decision('D-2', 'Approve [D-1].')))).toEqual([]);
    });

    test('new spec', ({ expect }) => {
      expect(checkChangelogChange(undefined, spec('X', d1))).toEqual([]);
      expect(checkChangelogChange(undefined, '# Spec\n')).toEqual([
        'A new spec needs a `## Changelog` with at least one decision.',
      ]);
    });

    test('edited decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('X', decision('D-1', 'Use Z.'), d2))).toEqual([
        'Decision D-1 was edited — the changelog is append-only; supersede it instead.',
      ]);
    });

    test('removed decision', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1, d2), spec('Y', d2, decision('D-3', 'Use Z.')))).toEqual([
        'Decision D-1 was removed — the changelog is append-only; supersede it instead.',
      ]);
    });

    test('decision inserted before an existing one', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('Y', d2, d1))).toEqual([
        'Decisions must stay in order, with new ones appended last.',
      ]);
    });

    test('out of sequence id', ({ expect }) => {
      expect(checkChangelogChange(spec('X', d1), spec('Y', d1, decision('D-3', 'Use Z.')))).toEqual([
        'Decision D-3 is out of sequence — the next id is D-2.',
      ]);
    });

    test('supersedes an unknown decision', ({ expect }) => {
      expect(
        checkChangelogChange(spec('X', d1), spec('Y', d1, decision('D-2', 'Use Z.', '\n  supersedes: D-9'))),
      ).toEqual(['Decision D-2 supersedes D-9, which is not in the changelog.']);
    });

    test('decisions outside the changelog are examples', ({ expect }) => {
      expect(
        checkChangelogChange(spec(decision('D-7', 'Example.'), d1), spec(decision('D-7', 'Example.'), d1, d2)),
      ).toEqual([]);
    });
  });

  describe('trivial edit', () => {
    test('whitespace only', ({ expect }) => {
      expect(isTrivialEdit('a  b\nc', 'a b c\n')).toBe(true);
    });

    test('up to three small typo fixes', ({ expect }) => {
      expect(isTrivialEdit('teh bord is recieved', 'the board is received')).toBe(true);
    });

    test('too many fixes', ({ expect }) => {
      expect(isTrivialEdit('aa bb cc dd', 'ab bc cd de')).toBe(false);
    });

    test('a word added or removed', ({ expect }) => {
      expect(isTrivialEdit('must move', 'must not move')).toBe(false);
    });

    test('a different word', ({ expect }) => {
      expect(isTrivialEdit('white moves first', 'black moves first')).toBe(false);
    });

    test('normative words', ({ expect }) => {
      expect(isTrivialEdit('you must move', 'you most move')).toBe(false);
      expect(isTrivialEdit('it can move', "it can't move")).toBe(false);
    });

    test('short words', ({ expect }) => {
      expect(isTrivialEdit('is on', 'in no')).toBe(false);
    });

    test('ids and numbers', ({ expect }) => {
      expect(isTrivialEdit('see F-1.2', 'see F-1.3')).toBe(false);
      expect(isTrivialEdit('max 8', 'max 9')).toBe(false);
    });
  });
});
