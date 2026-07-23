//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type DiffHunk,
  cherryPickHunk,
  computeCharHunks,
  computeHunks,
  diffHunks,
  groupHunks,
  rebaseHunks,
  rebaseHunksWith,
  revertHunk,
} from './diff';

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

  test('cherryPickHunk resolves only the anchored word hunk, not the whole line or other changes', ({ expect }) => {
    // Range over the changed word "CHANGED" in the modified (current) text.
    const start = modified.indexOf('CHANGED');
    const splice = cherryPickHunk(modified, original, { start, end: start + 'CHANGED'.length });
    expect(splice).toBeDefined();
    if (!splice) {
      return;
    }
    // Applying the splice to `modified` reverts that hunk to `original`.
    const applied = modified.slice(0, splice.from) + splice.insert + modified.slice(splice.from + splice.del);
    expect(applied).toContain('Line one.');
    expect(applied).not.toContain('CHANGED');
    // Word-level: the separate change on another line is untouched (would break with line granularity).
    expect(applied).toContain('Line three ADDED.');
  });

  test('reflects the latest compare text, not a snapshot', ({ expect }) => {
    const start = modified.indexOf('CHANGED');
    const range = { start, end: start + 'CHANGED'.length };

    // First compare version does not carry the later edit.
    const v1 = cherryPickHunk(modified, original, range);
    expect(v1?.insert).not.toContain('EDITED AGAIN');

    // Compare text edited further; cherry-pick now yields the NEWER version.
    const originalV2 = ['# Title', '', 'Line one EDITED AGAIN.', 'Line two.', ''].join('\n');
    const v2 = cherryPickHunk(modified, originalV2, range);
    expect(v2?.insert).toContain('EDITED AGAIN');
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

describe('rebaseHunks', () => {
  test('maps hunks 1:1 when the doc equals the base', ({ expect }) => {
    const base = 'The quick brown fox.';
    const hunks = diffHunks(base, 'The slow brown fox.');
    expect(rebaseHunks(base, base, hunks)).toEqual(hunks);
  });

  test('shifts a hunk after a doc insertion by the inserted length', ({ expect }) => {
    const base = 'The quick brown fox.';
    // The doc (branch) inserted "very " before "quick"; base offsets after it shift right by 5.
    const doc = 'The very quick brown fox.';
    const hunks = diffHunks(base, 'The quick brown cat.'); // fox -> cat, anchored in base.
    const [hunk] = hunks;
    const [rebased] = rebaseHunks(base, doc, hunks);
    // The rebased hunk lands on "fox" in the diverged doc, not on the user's inserted "very".
    expect(rebased.from).toBe(hunk.from + 'very '.length);
    expect(doc.slice(rebased.from, rebased.to)).toBe(hunk.removed);
  });

  test('leaves a base hunk before a later doc insertion unshifted', ({ expect }) => {
    const base = 'The quick brown fox.';
    const doc = 'The quick brown fox. More text.'; // appended after the change region.
    const hunks = diffHunks(base, 'The slow brown fox.'); // quick -> slow near the start.
    const [rebased] = rebaseHunks(base, doc, hunks);
    expect(rebased.from).toBe(hunks[0].from);
    expect(doc.slice(rebased.from, rebased.to)).toBe(hunks[0].removed);
  });

  test('a zero-width (pure-insertion) hunk at a doc-edit boundary never inverts (from <= to)', ({ expect }) => {
    // Bob inserts "!" right after "one" (a zero-width hunk at base offset 3); the user also inserts "X"
    // at that same offset. Both endpoints of the zero-width hunk must map to the same doc offset, so the
    // rebased range stays collapsed (from === to) rather than inverting.
    const base = 'one two';
    const doc = 'oneX two';
    const hunks = diffHunks(base, 'one! two'); // Bob inserts "!" at offset 3 (from === to).
    const [rebased] = rebaseHunks(base, doc, hunks);
    expect(rebased.from).toBe(rebased.to);
    expect(rebased.to).toBeGreaterThanOrEqual(rebased.from);
  });

  test('a foreign hunk ending exactly where a doc edit begins does not absorb the user text', ({ expect }) => {
    // Bob deletes "one " (base offsets [0,4)); the user inserts "X" at offset 4, immediately after.
    // The rebased strike must cover only "one ", never "one X" (the user's own adjacent character).
    const base = 'one two';
    const doc = 'one Xtwo';
    const hunks = diffHunks(base, 'two'); // Bob removes the leading "one ".
    const [rebased] = rebaseHunks(base, doc, hunks);
    expect(doc.slice(rebased.from, rebased.to)).toBe('one ');
  });

  test('rebaseHunksWith with a precomputed char diff equals rebaseHunks (hoist parity)', ({ expect }) => {
    // The hoisted path (compute the base↔doc char diff once, reuse across sources) must produce
    // identical results to the per-call rebaseHunks — several sources over the same diverged doc.
    const base = 'The quick brown fox jumps over the lazy dog.';
    const doc = 'The very quick brown fox leaps over the lazy dog.';
    const sources = ['The quick brown cat jumps over the lazy dog.', 'The quick brown fox jumps over the tired dog.'];
    const charHunks = computeCharHunks(base, doc);
    for (const source of sources) {
      const hunks = diffHunks(base, source);
      expect(rebaseHunksWith(charHunks, hunks)).toEqual(rebaseHunks(base, doc, hunks));
    }
  });
});

describe('groupHunks', () => {
  /** Apply every hunk's replacement to `before` (right-to-left so earlier offsets stay valid). */
  const applyAll = (before: string, hunks: DiffHunk[]): string =>
    [...hunks]
      .sort((a, b) => b.from - a.from)
      .reduce((text, hunk) => text.slice(0, hunk.from) + hunk.inserted + text.slice(hunk.to), before);

  test('default policy leaves each hunk its own group', ({ expect }) => {
    const before = 'alpha bravo charlie';
    const hunks = diffHunks(before, 'ALPHA bravo CHARLIE');
    expect(groupHunks(hunks, before)).toEqual(hunks);
  });

  test('coalesces adjacent hunks within maxGap and still reconstructs after', ({ expect }) => {
    const before = 'alpha bravo charlie';
    const after = 'ALPHA bravo CHARLIE';
    const hunks = diffHunks(before, after);
    expect(hunks).toHaveLength(2);
    // The gap between the two changes is ' bravo ' (7 chars); a maxGap covering it merges them.
    const grouped = groupHunks(hunks, before, { maxGap: 7 });
    expect(grouped).toHaveLength(1);
    expect(before.slice(grouped[0].from, grouped[0].to)).toBe(grouped[0].removed);
    expect(applyAll(before, grouped)).toBe(after);
  });

  test('respects block boundaries — a paragraph break is never bridged', ({ expect }) => {
    const before = 'alpha\n\nbravo';
    const after = 'ALPHA\n\nBRAVO';
    const hunks = diffHunks(before, after);
    expect(hunks).toHaveLength(2);
    // Even with a maxGap wide enough for the gap, the blank line keeps the groups separate.
    expect(groupHunks(hunks, before, { maxGap: 10 })).toHaveLength(2);
    // Opting out of boundary-respect bridges them.
    expect(groupHunks(hunks, before, { maxGap: 10, respectBlockBoundaries: false })).toHaveLength(1);
  });
});
