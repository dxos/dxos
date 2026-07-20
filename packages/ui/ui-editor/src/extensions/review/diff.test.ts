//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type DiffHunk, cherryPickHunk, computeHunks, diffHunks, revertHunk } from './diff';

describe('diff hunks', () => {
  const original = ['# Title', '', 'Line one.', 'Line two.', ''].join('\n');
  const modified = ['# Title', '', 'Line one CHANGED.', 'Line two.', 'Line three ADDED.', ''].join('\n');

  test('computeHunks finds changed regions', ({ expect }) => {
    const hunks = computeHunks(original, modified);
    expect(hunks.length).toBeGreaterThan(0);
    // Every hunk has consistent A/B ranges.
    for (const hunk of hunks) {
      expect(hunk.toA).toBeGreaterThanOrEqual(hunk.fromA);
      expect(hunk.toB).toBeGreaterThanOrEqual(hunk.fromB);
    }
  });

  test('cherryPickHunk applies the compare (A) version of the hunk overlapping the range', ({ expect }) => {
    // Range over "Line one CHANGED." in the modified (current) text.
    const start = modified.indexOf('Line one');
    const splice = cherryPickHunk(modified, original, { start, end: start + 4 });
    expect(splice).toBeDefined();
    if (!splice) {
      return;
    }
    // Applying the splice to `modified` yields a string where that hunk matches `original`.
    const applied = modified.slice(0, splice.from) + splice.insert + modified.slice(splice.from + splice.del);
    expect(applied).toContain('Line one.');
    expect(applied).not.toContain('Line one CHANGED.');
  });

  test('reflects the latest compare text, not a snapshot', ({ expect }) => {
    const start = modified.indexOf('Line one');
    const range = { start, end: start + 4 };

    // First compare version.
    const v1 = cherryPickHunk(modified, original, range);
    expect(v1?.insert).toContain('Line one.');

    // Compare text edited further; cherry-pick now yields the NEWER version.
    const originalV2 = ['# Title', '', 'Line one EDITED AGAIN.', 'Line two.', ''].join('\n');
    const v2 = cherryPickHunk(modified, originalV2, range);
    expect(v2?.insert).toContain('Line one EDITED AGAIN.');
  });

  test('returns undefined when the range is not on a changed hunk', ({ expect }) => {
    // "Line two." is identical in both → no hunk there.
    const start = modified.indexOf('Line two');
    expect(cherryPickHunk(modified, original, { start, end: start + 4 })).toBeUndefined();
  });

  test('revertHunk reverts the branch hunk at a base-side range back to base', ({ expect }) => {
    const base = 'alpha\nbravo\ncharlie\n';
    const branch = 'alpha\nBRAVO\ncharlie\n';
    // Range over 'bravo' in the base.
    const start = base.indexOf('bravo');
    const splice = revertHunk(base, branch, { start, end: start + 5 });
    expect(splice).toBeDefined();
    if (!splice) {
      return;
    }
    // Applying the splice to the branch restores the base text at that hunk.
    const applied = branch.slice(0, splice.from) + splice.insert + branch.slice(splice.from + splice.del);
    expect(applied).toBe(base);
  });

  test('revertHunk returns undefined when the base range is not on a changed hunk', ({ expect }) => {
    const base = 'alpha\nbravo\ncharlie\n';
    const branch = 'alpha\nBRAVO\ncharlie\n';
    const start = base.indexOf('charlie');
    expect(revertHunk(base, branch, { start, end: start + 4 })).toBeUndefined();
  });
});

describe('diffHunks', () => {
  /** Apply every hunk's replacement to `before` (right-to-left so earlier offsets stay valid). */
  const applyAll = (before: string, hunks: DiffHunk[]): string =>
    [...hunks]
      .sort((a, b) => b.from - a.from)
      .reduce((text, hunk) => text.slice(0, hunk.from) + hunk.inserted + text.slice(hunk.to), before);

  test('anchors ranges in the before text', ({ expect }) => {
    const before = 'the quick fox';
    const hunks = diffHunks(before, 'the slow fox');
    expect(hunks).toHaveLength(1);
    expect(before.slice(hunks[0].from, hunks[0].to)).toBe(hunks[0].removed);
    expect(hunks[0].removed).toBe('quick');
    expect(hunks[0].inserted).toBe('slow');
  });

  test('a pure insertion is a zero-width hunk', ({ expect }) => {
    const hunks = diffHunks('one three', 'one two three');
    expect(hunks).toHaveLength(1);
    expect(hunks[0].from).toBe(hunks[0].to);
    expect(hunks[0].removed).toBe('');
    expect(hunks[0].inserted).toBe('two ');
  });

  test('a pure deletion has no inserted text', ({ expect }) => {
    const hunks = diffHunks('one two three', 'one three');
    expect(hunks).toHaveLength(1);
    expect(hunks[0].inserted).toBe('');
    expect(hunks[0].removed).toBe('two ');
  });

  test('separates changes bounded by unchanged text into distinct hunks', ({ expect }) => {
    const before = 'alpha bravo charlie';
    const hunks = diffHunks(before, 'ALPHA bravo CHARLIE');
    expect(hunks).toHaveLength(2);
    expect(hunks.every((hunk) => before.slice(hunk.from, hunk.to) === hunk.removed)).toBe(true);
  });

  test('applying every hunk reconstructs the after text', ({ expect }) => {
    const cases: Array<[string, string]> = [
      ['the quick brown fox', 'the slow brown cat'],
      ['one three', 'one two three'],
      ['one two three', 'one three'],
      ['', 'abc def'],
      ['abc def', ''],
      ['same text', 'same text'],
      ['a b c d e', 'a X c Y e'],
    ];
    for (const [before, after] of cases) {
      expect(applyAll(before, diffHunks(before, after))).toBe(after);
    }
  });

  test('handles empty inputs', ({ expect }) => {
    expect(diffHunks('', '')).toEqual([]);
    expect(diffHunks('same', 'same')).toEqual([]);
  });
});
