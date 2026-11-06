//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildChangelogGraph } from '../ChangelogGraph/index.ts';
import { ledgerBlocks, ledgerDays, ledgerDecisions, ledgerThreads, matchesFilter, unapprovedIds } from './ledger.ts';

const decision = (id: string, title: string, fields: string[]) =>
  ['```mdl', `decision ${id}: ${title}`, ...fields.map((field) => `  ${field}`), '```', ''].join('\n');

const AGENT = ['by: agent:claude-code', 'for: user:alice'];

const SPEC = [
  '# Spec',
  '',
  '## Changelog',
  '',
  decision('D-1', 'Lists are sorted; by name first.', ['date: 2026-10-02', 'by: user:alice', 'affects: [F-1]']),
  decision('D-2', 'Sorting ignores case. Fills in [D-1].', ['date: 2026-10-02', ...AGENT, 'affects: [F-1]']),
  decision('D-3', 'Sorting follows the locale. Replaces [D-2].', ['date: 2026-10-03', ...AGENT, 'affects: [F-1]']),
  decision('D-4', 'Empty lists show a hint.', ['date: 2026-10-03', ...AGENT, 'affects: [F-2]']),
  decision('D-5', 'Lists page at 50 rows.', ['date: 2026-10-04', ...AGENT, 'affects: [F-1]']),
  decision('D-6', 'Approve [D-3].', ['date: 2026-10-04', 'by: user:alice']),
].join('\n');

const decisions = ledgerDecisions(buildChangelogGraph(SPEC));
const ids = (list: readonly { id: string }[]) => list.map(({ id }) => id);

describe('ledger', () => {
  test('lists decisions without the approvals, which mark what they approve', ({ expect }) => {
    expect(ids(decisions)).toEqual(['D-1', 'D-2', 'D-3', 'D-4', 'D-5']);
    expect(unapprovedIds(decisions)).toEqual(['D-4', 'D-5']);
  });

  test('groups decisions by block, the block decided on most recently first', ({ expect }) => {
    const blocks = ledgerBlocks(decisions, { status: 'holds' });
    expect(blocks.map(({ label }) => label)).toEqual(['F-1', 'F-2']);
    expect(ids(blocks[0].decisions)).toEqual(['D-5', 'D-3', 'D-2', 'D-1']);
    expect(ids(blocks[0].matching)).toEqual(['D-5', 'D-3', 'D-1']);
  });

  test('filters by status, decider and text', ({ expect }) => {
    const byId = (id: string) => decisions.find((entry) => entry.id === id) ?? expect.unreachable(id);
    expect(matchesFilter(byId('D-2'), { status: 'replaced' })).toBe(true);
    expect(matchesFilter(byId('D-3'), { status: 'unapproved' })).toBe(false);
    expect(matchesFilter(byId('D-1'), { status: 'holds', decider: 'claude-code' })).toBe(false);
    expect(matchesFilter(byId('D-4'), { status: 'holds', text: 'HINT' })).toBe(true);
    expect(matchesFilter(byId('D-4'), { status: 'holds', text: 'f-1' })).toBe(false);
  });

  test("splits a block into threads of decisions that cite one another, titled by the person's call", ({ expect }) => {
    const [block] = ledgerBlocks(decisions, { status: 'holds' });
    const threads = ledgerThreads(block.decisions);
    expect(threads.map(({ id, title, decisions }) => ({ id, title, decisions: ids(decisions) }))).toEqual([
      { id: 'D-5', title: 'Lists page at 50 rows', decisions: ['D-5'] },
      { id: 'D-3', title: 'Lists are sorted', decisions: ['D-1', 'D-2', 'D-3'] },
    ]);
  });

  test('reads a thread by day, an agent decision filling in a call on the same day as one step', ({ expect }) => {
    const [block] = ledgerBlocks(decisions, { status: 'holds' });
    const days = ledgerDays(ledgerThreads(block.decisions)[1]);
    expect(days.map(({ date, steps }) => ({ date, steps: steps.map(ids) }))).toEqual([
      { date: '2026-10-02', steps: [['D-1', 'D-2']] },
      { date: '2026-10-03', steps: [['D-3']] },
    ]);
  });
});
