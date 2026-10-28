//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ExplainNode } from '../client/types.ts';
import { explainFixture } from '../testing/explain-fixture.ts';
import {
  allOpen,
  barOf,
  defaultOpen,
  formatDuration,
  formatUsd,
  splitCurie,
  summarize,
  timeOf,
  walk,
} from './explain.ts';

const node = (fields: Partial<ExplainNode>): ExplainNode => ({
  id: 'n',
  kind: 'call',
  label: '',
  t: '2026-10-28T12:00:10.000Z',
  totalUsd: 0,
  pages: 0,
  facts: 0,
  results: 0,
  seq: 0,
  children: [],
  ...fields,
});

describe('trace', () => {
  test('formats time and cost', ({ expect }) => {
    expect(formatDuration(820)).toBe('820 ms');
    expect(formatDuration(4_200)).toBe('4.2 s');
    expect(formatDuration(215_126)).toBe('3m 35s');
    expect(formatDuration(undefined)).toBe('');
    expect(formatUsd(0)).toBe('');
    expect(formatUsd(0.0004)).toBe('<$0.001');
    expect(formatUsd(0.02186)).toBe('$0.0219');
    expect(formatUsd(0.5)).toBe('$0.500');
  });

  test("a row's bar sits on the timeline; a turn's ends at its timestamp", ({ expect }) => {
    const start = Date.parse('2026-10-28T12:00:00.000Z');
    expect(barOf(node({ wallMs: 5_000 }), start, 100_000)).toEqual({ left: 10, width: 5 });
    expect(barOf(node({ kind: 'turn', ms: 10_000 }), start, 100_000)).toEqual({ left: 0, width: 10 });
    // A sliver stays visible; no time, no bar.
    expect(barOf(node({ ms: 1 }), start, 100_000)?.width).toBe(0.4);
    expect(barOf(node({}), start, 100_000)).toBeUndefined();
  });

  test("a folded group's time is its own sum, not its wall time", ({ expect }) => {
    expect(timeOf(node({ group: 3, ms: 1_470, wallMs: 1_602 }))).toBe(1_470);
    expect(timeOf(node({ ms: 10, wallMs: 1_602 }))).toBe(1_602);
  });

  test('summarizes a real trace by what ran it', ({ expect }) => {
    const summary = summarize(explainFixture);
    let turns = 0;
    let folded = 0;
    walk(explainFixture, (row) => {
      turns += row.kind === 'turn' ? 1 : 0;
      folded += row.group ? 1 : 0;
    });
    expect(summary.turns).toBe(turns);
    expect(summary.categories.llm.count).toBe(turns);
    // System One calls count once each, through their folded group's children.
    expect(summary.models).toBe(summary.categories['system-one'].count);
    expect(folded).toBeGreaterThan(0);
    expect(summary.categories['system-one'].count).toBeGreaterThan(folded);
  });

  test('opens the session and its inputs first; expand all opens every row with children', ({ expect }) => {
    expect([...defaultOpen(explainFixture)]).toEqual([explainFixture.id, 'input-1']);
    const open = allOpen(explainFixture);
    walk(explainFixture, (row) => expect(open.has(row.id)).toBe(row.children.length > 0));
  });

  test('splits a CURIE so its prefix can be dimmed', ({ expect }) => {
    expect(splitCurie('schema:name')).toEqual(['schema:', 'name']);
    expect(splitCurie('lh:CafeOrCoffeeShop')).toEqual(['lh:', 'CafeOrCoffeeShop']);
    expect(splitCurie('https://x.org')).toEqual(['', 'https://x.org']);
  });
});
