//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { decorationSetToArray } from '../../util';
import { diffHunks } from './diff';
import { suggestChanges, suggestionKey, suggestions } from './suggest';

const ORIGINAL = 'The quick brown fox jumps over the lazy dog.';
const PROPOSAL = 'The fast brown fox leaps over the sleepy dog.';

/** Apply a single hunk (as the Accept control does) and return the resulting document. */
const accept = (doc: string, hunk: { from: number; to: number; inserted: string }): string =>
  doc.slice(0, hunk.from) + hunk.inserted + doc.slice(hunk.to);

describe('suggestChanges', () => {
  test('loads as an editor extension', ({ expect }) => {
    const state = EditorState.create({ doc: ORIGINAL, extensions: [suggestChanges({ proposal: PROPOSAL })] });
    expect(state.doc.toString()).toBe(ORIGINAL);
  });

  test('accepting a change splices the proposal into the document for that hunk', ({ expect }) => {
    const hunks = diffHunks(ORIGINAL, PROPOSAL);
    expect(hunks.length).toBeGreaterThan(1);

    // Accepting the first change resolves exactly that hunk; the rest remain suggested.
    const accepted = accept(ORIGINAL, hunks[0]);
    const remaining = diffHunks(accepted, PROPOSAL);
    expect(remaining).toHaveLength(hunks.length - 1);

    // Accepting every change (in reverse to keep offsets valid) reconstructs the proposal.
    const all = [...hunks].sort((a, b) => b.from - a.from).reduce(accept, ORIGINAL);
    expect(all).toBe(PROPOSAL);
  });

  test('rejecting hides one change by its position-independent key', ({ expect }) => {
    const hunks = diffHunks(ORIGINAL, PROPOSAL);
    const author = '';
    const dismissed = new Set([suggestionKey(hunks[0], author)]);
    const visible = hunks.filter((hunk) => !dismissed.has(suggestionKey(hunk, author)));
    expect(visible).toHaveLength(hunks.length - 1);
    // The rejected hunk's key does not collide with the others.
    expect(visible.some((hunk) => suggestionKey(hunk, author) === suggestionKey(hunks[0], author))).toBe(false);
  });

  test('the same change by two authors gets distinct keys', ({ expect }) => {
    const [hunk] = diffHunks(ORIGINAL, PROPOSAL);
    expect(suggestionKey(hunk, 'did:alice')).not.toBe(suggestionKey(hunk, 'did:bob'));
  });
});

/** The struck (deleted-original) ranges the suggestion overlay currently decorates. */
const deleteRanges = (view: EditorView): Array<{ from: number; to: number }> => {
  const ranges: Array<{ from: number; to: number }> = [];
  for (const source of view.state.facet(EditorView.decorations)) {
    const set = typeof source === 'function' ? source(view) : source;
    if (!set) {
      continue;
    }
    for (const range of decorationSetToArray(set)) {
      if (range.value.spec?.class === 'cm-suggest-delete') {
        ranges.push({ from: range.from, to: range.to });
      }
    }
  }
  return ranges;
};

describe('suggestions with an explicit base', () => {
  // The accepted base (main). Foreign authors' proposals are computed relative to this.
  const MAIN = 'The quick brown fox jumps over the lazy dog.';
  // The user's own branch (the editor document): they inserted "really " — no foreign author touched it.
  const BRANCH = 'The really quick brown fox jumps over the lazy dog.';
  // Bob's proposal vs MAIN: "lazy" -> "sleepy".
  const BOB = 'The quick brown fox jumps over the sleepy dog.';

  test('diffs a foreign source against base and rebases its hunks into doc coords', ({ expect }) => {
    const view = new EditorView({
      doc: BRANCH,
      extensions: [suggestions({ base: MAIN, sources: [{ author: 'did:bob', colour: 'x', content: BOB }] })],
    });

    const ranges = deleteRanges(view);
    expect(ranges).toHaveLength(1);
    // The strike lands on bob's removed word, shifted past the user's own insertion.
    expect(BRANCH.slice(ranges[0].from, ranges[0].to)).toBe('lazy');
    // Critically it does NOT strike the user's inserted "really" (the diff-vs-doc bug).
    const insertedFrom = BRANCH.indexOf('really');
    const insertedTo = insertedFrom + 'really'.length;
    expect(ranges.every((range) => range.to <= insertedFrom || range.from >= insertedTo)).toBe(true);

    view.destroy();
  });

  test('without base, the foreign source diffs against the doc and strikes the user text', ({ expect }) => {
    // Diffing BOB against the BRANCH doc reads the user's "really" as text bob would delete — the bug
    // that `base` fixes.
    const view = new EditorView({
      doc: BRANCH,
      extensions: [suggestions({ sources: [{ author: 'did:bob', colour: 'x', content: BOB }] })],
    });

    const struck = deleteRanges(view).map((range) => BRANCH.slice(range.from, range.to));
    expect(struck.join(' ')).toContain('really');

    view.destroy();
  });
});
