//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildChangelogGraph, buildQuestions } from '../ChangelogGraph/index.ts';
import { ledgerDecisions } from '../DecisionLedger/index.ts';
import { cursorDecisions, focusAt } from './cursor-decisions.ts';

const SPEC = [
  '# Spec',
  '',
  '```mdl',
  'feat F-1: Lists',
  '  req F-1.1: Lists are sorted.',
  '  req F-1.2: Lists page.',
  '```',
  '',
  '## Changelog',
  '',
  '```mdl',
  'decision D-1: Lists are a feature.',
  '  date: 2026-10-02',
  '  by: user:alice',
  '  affects: [F-1]',
  '```',
  '',
  '```mdl',
  'decision D-2: Sorting ignores case.',
  '  date: 2026-10-02',
  '  by: user:alice',
  '  affects: [F-1.1]',
  '```',
  '',
  '```mdl',
  'decision D-3: Sorting follows the locale. Replaces [D-2].',
  '  date: 2026-10-03',
  '  by: user:alice',
  '  affects: [F-1.1]',
  '```',
  '',
  '```mdl',
  'question Q-1: How many rows to a page?',
  '  date: 2026-10-03',
  '  by: agent:claude-code',
  '  for: user:alice',
  '  affects: [F-1.2]',
  '  options:',
  '    - 50: one screen.',
  '    - 100: fewer pages.',
  '```',
  '',
].join('\n');

const at = (fragment: string) => SPEC.indexOf(fragment) + 2;
const ids = (list: readonly { id: string }[]) => list.map(({ id }) => id);

describe('focusAt', () => {
  test('finds the block and the item the cursor is on', ({ expect }) => {
    expect(focusAt(SPEC, at('req F-1.2'))).toEqual({ type: 'feat', id: 'F-1', item: 'F-1.2' });
    expect(focusAt(SPEC, at('feat F-1'))).toEqual({ type: 'feat', id: 'F-1' });
    expect(focusAt(SPEC, at('decision D-3'))).toEqual({ type: 'decision', id: 'D-3' });
  });

  test('takes the nearest block when the cursor is between fences', ({ expect }) => {
    expect(focusAt(SPEC, 0)).toEqual({ type: 'feat', id: 'F-1' });
  });
});

describe('cursorDecisions', () => {
  const decisions = ledgerDecisions(buildChangelogGraph(SPEC));
  const questions = buildQuestions(SPEC);

  test('on an item: what holds there, what holds on its block, and what was replaced', ({ expect }) => {
    const found = cursorDecisions({ type: 'feat', id: 'F-1', item: 'F-1.1' }, decisions, questions);
    expect(ids(found.here)).toEqual(['D-3']);
    expect(ids(found.enclosing)).toEqual(['D-1']);
    expect(ids(found.within)).toEqual([]);
    expect(ids(found.replaced)).toEqual(['D-2']);
  });

  test("on a block: what holds on it and on its items, and its items' open questions", ({ expect }) => {
    const found = cursorDecisions({ type: 'feat', id: 'F-1' }, decisions, questions);
    expect(ids(found.here)).toEqual(['D-1']);
    expect(ids(found.within)).toEqual(['D-3']);
    expect(ids(found.questions)).toEqual([]);
    expect(ids(cursorDecisions({ type: 'feat', id: 'F-1', item: 'F-1.2' }, decisions, questions).questions)).toEqual([
      'Q-1',
    ]);
  });
});
