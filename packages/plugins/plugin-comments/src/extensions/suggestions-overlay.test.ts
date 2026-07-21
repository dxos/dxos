//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EditorView, type SuggestionSource, decorationSetToArray } from '@dxos/ui-editor';

import { suggestionsOverlay } from './suggestions-overlay';

const ORIGINAL = 'The quick brown fox jumps over the lazy dog.';
// A pure insertion (adds "swiftly") relative to ORIGINAL, so the overlay renders one hunk.
const WITH_INSERTED_WORD = 'The quick brown fox jumps swiftly over the lazy dog.';

/** Count every decoration range the state's decoration sources currently contribute. */
const decorationCount = (view: EditorView): number => {
  let count = 0;
  for (const source of view.state.facet(EditorView.decorations)) {
    const set = typeof source === 'function' ? source(view) : source;
    if (set) {
      count += decorationSetToArray(set).length;
    }
  }
  return count;
};

describe('suggestionsOverlay', () => {
  test('reconfigure swaps the live suggestion decorations in and out', ({ expect }) => {
    const overlay = suggestionsOverlay();
    const view = new EditorView({ doc: ORIGINAL, extensions: [overlay.extension] });

    // Nothing overlaid until reconfigured.
    expect(decorationCount(view)).toBe(0);

    const sources: SuggestionSource[] = [
      { author: 'did:alice', colour: 'var(--color-blue-text)', content: WITH_INSERTED_WORD },
    ];
    overlay.reconfigure(view, sources, true);
    expect(decorationCount(view)).toBeGreaterThan(0);

    // Disabling (or clearing sources) tears the overlay back down live, without remounting.
    overlay.reconfigure(view, [], false);
    expect(decorationCount(view)).toBe(0);

    view.destroy();
  });

  test('reconfigure with enabled=true but no sources produces no decorations', ({ expect }) => {
    const overlay = suggestionsOverlay();
    const view = new EditorView({ doc: ORIGINAL, extensions: [overlay.extension] });

    overlay.reconfigure(view, [], true);
    expect(decorationCount(view)).toBe(0);

    view.destroy();
  });
});
