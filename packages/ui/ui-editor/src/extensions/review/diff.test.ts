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
  pairMarkupHunks,
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

  // A pure insertion is empty on the base side, and the review companion anchors it at that single
  // offset — so both sides of the overlap test are zero-width. A strict half-open test never matches,
  // which made Accept/Reject silently no-op for every suggestion that only adds text.
  test('accepts and reverts a pure insertion anchored at an empty range', ({ expect }) => {
    const base = 'alpha\nbravo\n';
    const branch = 'alpha\nbravo\ncharlie\n';
    const at = base.length;

    // Accept: splice the branch's added line into the base.
    const accept = cherryPickHunk(base, branch, { start: at, end: at });
    expect(accept).toBeDefined();
    if (!accept) {
      return;
    }
    expect(base.slice(0, accept.from) + accept.insert + base.slice(accept.from + accept.del)).toBe(branch);

    // Reject: strip the addition back off the branch.
    const revert = revertHunk(base, branch, { start: at, end: at });
    expect(revert).toBeDefined();
    if (!revert) {
      return;
    }
    expect(branch.slice(0, revert.from) + revert.insert + branch.slice(revert.from + revert.del)).toBe(base);
  });
});

describe('pairMarkupHunks', () => {
  test('a multi-word bold wrap coalesces into one atomic replace', ({ expect }) => {
    const before = 'alpha bravo charlie delta.';
    const hunks = diffHunks(before, 'alpha **bravo charlie** delta.');
    expect(hunks).toHaveLength(2);
    const paired = pairMarkupHunks(hunks, before);
    expect(paired).toHaveLength(1);
    expect(paired[0].removed).toBe('bravo charlie');
    expect(paired[0].inserted).toBe('**bravo charlie**');
  });

  test('a single-word wrap is already one hunk and passes through', ({ expect }) => {
    const before = 'alpha bravo charlie';
    const hunks = pairMarkupHunks(diffHunks(before, 'alpha **bravo** charlie'), before);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].inserted).toBe('**bravo**');
  });

  test('does not bridge across a line break or pair unrelated inserts', ({ expect }) => {
    const before = 'alpha\nbravo';
    const hunks = diffHunks(before, '**alpha\nbravo**');
    expect(pairMarkupHunks(hunks, before)).toHaveLength(2);
    const unrelated = diffHunks('one two three', 'one X two Y three');
    expect(pairMarkupHunks(unrelated, 'one two three')).toHaveLength(2);
  });

  test('cherry-picking a pair-spanning range applies the whole pair', ({ expect }) => {
    const current = 'alpha bravo charlie delta.';
    const compare = 'alpha **bravo charlie** delta.';
    // The paired hunk's range in `current` covers the wrapped words.
    const splice = cherryPickHunk(current, compare, { start: 6, end: 19 });
    expect(splice).toBeDefined();
    const applied = current.slice(0, splice!.from) + splice!.insert + current.slice(splice!.from + splice!.del);
    expect(applied).toBe(compare);
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

  test('an insert adjacent to identical text stays a pure insertion (minimal hunk)', ({ expect }) => {
    // Word-level diffing sees `WorldHello` -> `WorldHelloWorld` as one changed word; the hunk must
    // still not claim the unchanged `WorldHello` — a replace here strikes real document text and
    // re-inserts it, which renders as doubled content.
    const before = '# Hello WorldHello\n\n';
    const hunks = diffHunks(before, '# Hello WorldHelloWorld\n\n');
    expect(hunks).toHaveLength(1);
    expect(hunks[0].removed).toBe('');
    expect(hunks[0].inserted).toBe('World');
    expect(hunks[0].from).toBe(hunks[0].to);
    expect(applyAll(before, hunks)).toBe('# Hello WorldHelloWorld\n\n');
  });

  test('a delete adjacent to identical text stays a pure deletion (minimal hunk)', ({ expect }) => {
    const before = '# Hello WorldHelloWorld\n\n';
    const hunks = diffHunks(before, '# Hello WorldHello\n\n');
    expect(hunks).toHaveLength(1);
    expect(hunks[0].inserted).toBe('');
    expect(hunks[0].removed).toBe('World');
    expect(applyAll(before, hunks)).toBe('# Hello WorldHello\n\n');
  });

  test('a genuine word replace keeps word granularity (no mid-word trim)', ({ expect }) => {
    const before = 'the lazy dog';
    const hunks = diffHunks(before, 'the lively dog');
    expect(hunks).toHaveLength(1);
    expect(hunks[0].removed).toBe('lazy');
    expect(hunks[0].inserted).toBe('lively');
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

  test('a doc insertion at a trailing pure-insert anchor stays BEHIND the proposal', ({ expect }) => {
    // The author proposed "World\n" at the end of base; the user then typed "After" at that same
    // spot on main. The proposal must stay anchored BEFORE the user's new text — mapping it past the
    // insertion renders the user's input "in front" of the suggestion they typed after.
    const base = '# Hello World\nHello\n';
    const doc = '# Hello World\nHello\nAfter';
    const hunks = diffHunks(base, '# Hello World\nHello\nWorld\n');
    expect(hunks).toEqual([{ from: 20, to: 20, removed: '', inserted: 'World\n' }]);
    const [rebased] = rebaseHunks(base, doc, hunks);
    expect(rebased.from).toBe(20);
    expect(rebased.to).toBe(20);
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

describe('computeCharHunks', () => {
  // Character diffing is what keeps a single keystroke from restyling a whole word, but it aligns on
  // any matching character — so deleting whole words can anchor mid-token (the `t` of `it` matching the
  // `t` of `two`), striking half of two words the reader never touched.
  test('a whole-word deletion anchors on word boundaries, not mid-token', ({ expect }) => {
    const original = 'the revision it was written on, so two people can suggest';
    const modified = 'the revision two people can suggest';

    const hunks = computeCharHunks(original, modified);
    expect(hunks).toHaveLength(1);
    expect(original.slice(hunks[0].fromA, hunks[0].toA)).toBe('it was written on, so ');
  });
});

describe('overlay hunks after the reader edits', () => {
  const MAIN =
    'The editor now tracks suggestions from every collaborator at once. Each proposal is diffed against the revision it was written on, so two people can suggest changes.';
  // Alice proposes replacing a run of words further along the paragraph.
  const ALICE = MAIN.replace('it was written on, so two people can', 'the revision it was written on, so anyone may');

  /** What the overlay renders: the proposal diffed against its anchor, rebased into doc coordinates. */
  const overlayHunks = (doc: string) => rebaseHunksWith(computeCharHunks(MAIN, doc), diffHunks(MAIN, ALICE));

  /** A struck span must not cut a word in half — `written` may not render as `wri` + struck `tten`. */
  const splitsWord = (text: string, offset: number) =>
    offset > 0 && offset < text.length && /\w/.test(text[offset - 1]) && /\w/.test(text[offset]);

  test('a foreign strike keeps whole words when the reader edits inside a nearby word', ({ expect }) => {
    // The reader corrects a typo inside `written` — a character-level edit in the middle of a word.
    const doc = MAIN.replace('written', 'writtten');
    for (const hunk of overlayHunks(doc)) {
      if (hunk.to > hunk.from) {
        expect(splitsWord(doc, hunk.from)).toBe(false);
        expect(splitsWord(doc, hunk.to)).toBe(false);
      }
    }
  });

  test('a foreign strike keeps whole words when the reader deletes words before it', ({ expect }) => {
    const doc = MAIN.replace('from every collaborator ', '');
    for (const hunk of overlayHunks(doc)) {
      if (hunk.to > hunk.from) {
        expect(splitsWord(doc, hunk.from)).toBe(false);
        expect(splitsWord(doc, hunk.to)).toBe(false);
      }
    }
  });
});
