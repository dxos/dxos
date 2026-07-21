//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { diffHunks } from './diff';
import { suggestChanges, suggestionKey } from './suggest';

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
