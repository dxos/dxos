//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseReview, statusOf, summarizeReview, walkthroughOf } from './review.ts';

const fence = (body: string) => ['```mdl', body, '```'].join('\n');

const REVIEW = [
  '---',
  'spec: github:dxos/dxos/packages/plugins/plugin-x/PLUGIN.mdl',
  'commit: 0123456789abcdef',
  'date: 2026-10-22',
  'by: agent:claude-code',
  '---',
  '',
  fence(
    [
      'verdict F-1.1: The action is registered.',
      '  status: done',
      '  evidence: [github:dxos/dxos/packages/plugins/plugin-x/src/a.ts#openThing]',
      '  tests: [github:dxos/dxos/packages/plugins/plugin-x/src/a.test.ts#opens]',
    ].join('\n'),
  ),
  fence(
    ['verdict F-1.2: No picker yet.', '  status: missing', '  note: |', '    Nothing calls the dialog.'].join('\n'),
  ),
  fence(['verdict Thing: Fields match.', '  status: bogus'].join('\n')),
].join('\n\n');

describe('review', () => {
  test('parses frontmatter and verdicts, dropping unknown statuses', ({ expect }) => {
    const review = parseReview(REVIEW);
    expect(review).toMatchObject({ commit: '0123456789abcdef', by: 'agent:claude-code' });
    expect(review.verdicts).toEqual([
      {
        id: 'F-1.1',
        status: 'done',
        summary: 'The action is registered.',
        evidence: ['github:dxos/dxos/packages/plugins/plugin-x/src/a.ts#openThing'],
        tests: ['github:dxos/dxos/packages/plugins/plugin-x/src/a.test.ts#opens'],
        walkthrough: [],
      },
      {
        id: 'F-1.2',
        status: 'missing',
        summary: 'No picker yet.',
        evidence: [],
        tests: [],
        walkthrough: [],
        note: 'Nothing calls the dialog.',
      },
    ]);
  });

  test('reads evidence wrapped over several lines or as list items', ({ expect }) => {
    const wrapped = fence(
      ['verdict T: Ok.', '  status: done', '  evidence:', '    [github:o/r/a.ts#A,', '     github:o/r/b.ts#B]'].join(
        '\n',
      ),
    );
    const items = fence(['verdict U: Ok.', '  status: done', '  evidence:', '    - github:o/r/c.ts#C'].join('\n'));
    expect(parseReview(`${wrapped}\n\n${items}`).verdicts.map(({ evidence }) => evidence)).toEqual([
      ['github:o/r/a.ts#A', 'github:o/r/b.ts#B'],
      ['github:o/r/c.ts#C'],
    ]);
  });

  test("a walkthrough is the reviewer's steps, or one per evidence key when there are several", ({ expect }) => {
    const review = parseReview(
      [
        fence(
          [
            'verdict op1: Ok.',
            '  status: done',
            '  evidence: [github:o/r/a.ts#A, github:o/r/b.ts#B]',
            '  walkthrough:',
            '    - The operation is declared with its schema. github:o/r/a.ts#A',
            '    - The handler resolves the checkout',
            '      and creates the object. github:o/r/b.ts#B',
          ].join('\n'),
        ),
        fence(['verdict op2: Ok.', '  status: done', '  evidence: [github:o/r/a.ts#A, github:o/r/c.ts]'].join('\n')),
        fence(['verdict type1: Ok.', '  status: done', '  evidence: [github:o/r/a.ts#T]'].join('\n')),
      ].join('\n\n'),
    );
    const [explicit, derived, single] = review.verdicts.map(walkthroughOf);
    expect(explicit).toEqual([
      { text: 'The operation is declared with its schema', key: 'github:o/r/a.ts#A' },
      { text: 'The handler resolves the checkout and creates the object', key: 'github:o/r/b.ts#B' },
    ]);
    expect(derived).toEqual([
      { text: '', key: 'github:o/r/a.ts#A' },
      { text: '', key: 'github:o/r/c.ts' },
    ]);
    expect(single).toBeUndefined();
  });

  test('a feature takes the worst status of its requirements', ({ expect }) => {
    const review = parseReview(REVIEW);
    expect(statusOf(review, 'F-1')).toBe('missing');
    expect(statusOf(review, 'F-1.1')).toBe('done');
    expect(statusOf(review, 'F-2')).toBeUndefined();
    expect(summarizeReview(review)).toEqual([
      { status: 'done', count: 1 },
      { status: 'missing', count: 1 },
    ]);
  });
});
