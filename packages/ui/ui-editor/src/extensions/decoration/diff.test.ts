//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { cherryPickHunk, computeHunks } from './diff';

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
});
