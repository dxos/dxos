//
// Copyright 2026 DXOS.org
//

import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

/** Ranges to highlight, as [from, to) offsets into the item's document. */
export type HighlightRange = readonly [number, number];

export const setHighlights = StateEffect.define<readonly HighlightRange[]>();

const mark = Decoration.mark({ class: 'dx-feed-hit' });

const clamp = (offset: number, length: number) => Math.max(0, Math.min(offset, length));

/**
 * Highlights pushed in from the model.
 *
 * Search runs over the feed's projection rather than per-view (most messages are never mounted), so
 * the item receives ranges instead of owning search state.
 */
export const highlights = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setHighlights)) {
        const length = tr.state.doc.length;
        return Decoration.set(
          effect.value
            // Clamp against the current document at both ends: a hit computed on the model can
            // outrun a view whose streaming tail has not arrived yet, and a decoration outside
            // `[0, length]` throws rather than being ignored.
            .map(([from, to]) => [clamp(from, length), clamp(to, length)] as const)
            .filter(([from, to]) => from < to)
            .map(([from, to]) => mark.range(from, to)),
          true,
        );
      }
    }

    return tr.docChanged ? value.map(tr.changes) : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const highlightTheme = EditorView.baseTheme({
  '.dx-feed-hit': {
    backgroundColor: 'var(--dx-accentFill)',
    color: 'var(--dx-accentFillText)',
    borderRadius: '2px',
  },
});
