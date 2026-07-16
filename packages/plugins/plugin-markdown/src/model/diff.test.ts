//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { diffSpans, diffStats, merge3 } from './diff';

describe('diffSpans', () => {
  test('computes insert/delete/equal spans', ({ expect }) => {
    const spans = diffSpans('the quick fox', 'the slow fox');
    expect(spans.map((span) => span.kind)).toEqual(['equal', 'delete', 'insert', 'equal']);
    expect(spans.find((span) => span.kind === 'insert')?.text).toBe('slow');
  });

  test('offsets index into the after text', ({ expect }) => {
    const spans = diffSpans('one three', 'one two three');
    const insert = spans.find((span) => span.kind === 'insert');
    if (!insert) {
      throw new Error('expected an insert span');
    }
    expect('one two three'.slice(insert.from, insert.to)).toBe(insert.text);
  });

  test('handles empty inputs', ({ expect }) => {
    expect(diffSpans('', '')).toEqual([]);
    expect(diffSpans('', 'abc')).toEqual([{ kind: 'insert', from: 0, to: 3, text: 'abc' }]);
    expect(diffSpans('abc', '')).toEqual([{ kind: 'delete', from: 0, to: 0, text: 'abc' }]);
  });
});

describe('diffStats', () => {
  test('counts insertions and deletions', ({ expect }) => {
    const stats = diffStats(diffSpans('the quick fox', 'the slow fox jumped'));
    expect(stats.insertions).toBeGreaterThan(0);
    expect(stats.deletions).toBeGreaterThan(0);
  });
});

describe('merge3', () => {
  test('merges non-overlapping changes from both sides', ({ expect }) => {
    const base = 'alpha\nbravo\ncharlie\n';
    const ours = 'alpha edited\nbravo\ncharlie\n';
    const theirs = 'alpha\nbravo\ncharlie edited\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha edited\nbravo\ncharlie edited\n');
  });

  test('applies identical hunks from both sides once', ({ expect }) => {
    const base = 'alpha\nbravo\n';
    const both = 'alpha edited\nbravo\n';
    const result = merge3({ base, ours: both, theirs: both });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe(both);
  });

  test('marks conflicting hunks, preferring theirs first', ({ expect }) => {
    const base = 'alpha\nbravo\n';
    const ours = 'alpha ours\nbravo\n';
    const theirs = 'alpha theirs\nbravo\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('<<<<<<<');
    expect(result.text.indexOf('alpha theirs')).toBeLessThan(result.text.indexOf('alpha ours'));
  });

  test('returns theirs when ours is unchanged from base', ({ expect }) => {
    const base = 'alpha\n';
    const theirs = 'alpha\nbeta\n';
    expect(merge3({ base, ours: base, theirs }).text).toBe(theirs);
  });

  test('returns ours when theirs is unchanged from base', ({ expect }) => {
    const base = 'alpha\n';
    const ours = 'alpha\nbeta\n';
    expect(merge3({ base, ours, theirs: base }).text).toBe(ours);
  });

  test('merges appends at end of file from one side', ({ expect }) => {
    const base = 'alpha\nbravo\n';
    const ours = 'alpha\nbravo\n';
    const theirs = 'alpha\nbravo\ncharlie\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha\nbravo\ncharlie\n');
  });

  test('merges from an empty base', ({ expect }) => {
    const result = merge3({ base: '', ours: 'ours\n', theirs: 'theirs\n' });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('ours');
    expect(result.text).toContain('theirs');
  });

  test('handles deletion on one side and edit elsewhere on the other', ({ expect }) => {
    const base = 'alpha\nbravo\ncharlie\n';
    const ours = 'alpha\ncharlie\n';
    const theirs = 'alpha\nbravo\ncharlie edited\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha\ncharlie edited\n');
  });

  test('marks staggered overlapping hunks as a conflict', ({ expect }) => {
    // Ours replaces base lines [0,2); theirs edits [1,2) — overlapping but different starts.
    const base = 'alpha\nbravo\ncharlie\n';
    const ours = 'replaced\ncharlie\n';
    const theirs = 'alpha\nbravo edited\ncharlie\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('<<<<<<< branch');
    expect(result.text).toContain('bravo edited');
    expect(result.text).toContain('replaced');
    // Untouched trailing content survives outside the conflict block.
    expect(result.text.trimEnd().endsWith('charlie')).toBe(true);
  });

  test('staggered conflict regions include each side of the union', ({ expect }) => {
    // Theirs replaces [0,3); ours edits [2,3) only — theirs' side must still carry its full block.
    const base = 'one\ntwo\nthree\nfour\n';
    const ours = 'one\ntwo\nthree edited\nfour\n';
    const theirs = 'rewritten\nfour\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('rewritten');
    expect(result.text).toContain('three edited');
    // Ours' side of the union keeps the base lines it left unchanged.
    const oursSection = result.text.slice(result.text.indexOf('======='), result.text.indexOf('>>>>>>>'));
    expect(oursSection).toContain('one');
    expect(oursSection).toContain('two');
  });

  test('adjacent hunks do not conflict', ({ expect }) => {
    const base = 'alpha\nbravo\n';
    const ours = 'alpha edited\nbravo\n';
    const theirs = 'alpha\nbravo edited\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha edited\nbravo edited\n');
  });

  test('preserves content without trailing newline', ({ expect }) => {
    const base = 'alpha';
    const ours = 'alpha';
    const theirs = 'alpha bravo';
    const result = merge3({ base, ours, theirs });
    expect(result.text).toBe('alpha bravo');
  });
});
