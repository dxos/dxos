//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { diffSpans, diffStats, merge3 } from './diff';

describe('diffSpans', () => {
  it('computes insert/delete/equal spans', () => {
    const spans = diffSpans('the quick fox', 'the slow fox');
    expect(spans.map((span) => span.kind)).toEqual(['equal', 'delete', 'insert', 'equal']);
    expect(spans.find((span) => span.kind === 'insert')?.text).toBe('slow');
  });

  it('offsets index into the after text', () => {
    const spans = diffSpans('one three', 'one two three');
    const insert = spans.find((span) => span.kind === 'insert');
    expect(insert).toBeDefined();
    expect('one two three'.slice(insert!.from, insert!.to)).toBe(insert!.text);
  });

  it('handles empty inputs', () => {
    expect(diffSpans('', '')).toEqual([]);
    expect(diffSpans('', 'abc')).toEqual([{ kind: 'insert', from: 0, to: 3, text: 'abc' }]);
    expect(diffSpans('abc', '')).toEqual([{ kind: 'delete', from: 0, to: 0, text: 'abc' }]);
  });
});

describe('diffStats', () => {
  it('counts insertions and deletions', () => {
    const stats = diffStats(diffSpans('the quick fox', 'the slow fox jumped'));
    expect(stats.insertions).toBeGreaterThan(0);
    expect(stats.deletions).toBeGreaterThan(0);
  });
});

describe('merge3', () => {
  it('merges non-overlapping changes from both sides', () => {
    const base = 'alpha\nbravo\ncharlie\n';
    const ours = 'alpha edited\nbravo\ncharlie\n';
    const theirs = 'alpha\nbravo\ncharlie edited\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha edited\nbravo\ncharlie edited\n');
  });

  it('applies identical hunks from both sides once', () => {
    const base = 'alpha\nbravo\n';
    const both = 'alpha edited\nbravo\n';
    const result = merge3({ base, ours: both, theirs: both });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe(both);
  });

  it('marks conflicting hunks, preferring theirs first', () => {
    const base = 'alpha\nbravo\n';
    const ours = 'alpha ours\nbravo\n';
    const theirs = 'alpha theirs\nbravo\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('<<<<<<<');
    expect(result.text.indexOf('alpha theirs')).toBeLessThan(result.text.indexOf('alpha ours'));
  });

  it('returns theirs when ours is unchanged from base', () => {
    const base = 'alpha\n';
    const theirs = 'alpha\nbeta\n';
    expect(merge3({ base, ours: base, theirs }).text).toBe(theirs);
  });

  it('returns ours when theirs is unchanged from base', () => {
    const base = 'alpha\n';
    const ours = 'alpha\nbeta\n';
    expect(merge3({ base, ours, theirs: base }).text).toBe(ours);
  });

  it('merges appends at end of file from one side', () => {
    const base = 'alpha\nbravo\n';
    const ours = 'alpha\nbravo\n';
    const theirs = 'alpha\nbravo\ncharlie\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha\nbravo\ncharlie\n');
  });

  it('merges from an empty base', () => {
    const result = merge3({ base: '', ours: 'ours\n', theirs: 'theirs\n' });
    expect(result.conflicts).toBe(1);
    expect(result.text).toContain('ours');
    expect(result.text).toContain('theirs');
  });

  it('handles deletion on one side and edit elsewhere on the other', () => {
    const base = 'alpha\nbravo\ncharlie\n';
    const ours = 'alpha\ncharlie\n';
    const theirs = 'alpha\nbravo\ncharlie edited\n';
    const result = merge3({ base, ours, theirs });
    expect(result.conflicts).toBe(0);
    expect(result.text).toBe('alpha\ncharlie edited\n');
  });

  it('preserves content without trailing newline', () => {
    const base = 'alpha';
    const ours = 'alpha';
    const theirs = 'alpha bravo';
    const result = merge3({ base, ours, theirs });
    expect(result.text).toBe('alpha bravo');
  });
});
