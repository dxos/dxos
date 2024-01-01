//
// Copyright 2023 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, hoverTooltip } from '@codemirror/view';
import sortBy from 'lodash.sortby';
import { useEffect } from 'react';

import { tooltipContent } from '@dxos/react-ui-theme';

import { type DocumentRange, type Range } from '../../../hooks';

// TODO(burdon): Detect click, or cursor proximity.

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-highlight': {
    backgroundColor: 'yellow', // TODO(burdon): Reconcile with tailwind theme.
  },
  '& .cm-highlight::before': {
    content: ']',
  },
  '& .cm-highlight-active': {
    backgroundColor: 'lime',
  },
});

const marks = {
  highlight: Decoration.mark({ class: 'cm-highlight' }),
  HighlightActive: Decoration.mark({ class: 'cm-highlight-active' }),
};

type HighlightRange = DocumentRange & { active?: boolean };

// TODO(burdon): Make configurable to support multiple layers.
const setHighlights = StateEffect.define<HighlightRange[]>();

/**
 * Update field set.
 */
// TODO(burdon): Reconcile range from data model, vs. in-markdown characters.
export const useHighlights = (view: EditorView | undefined, ranges: HighlightRange[] = []) => {
  useEffect(() => {
    view?.dispatch({
      effects: setHighlights.of(ranges),
    });
  }, [view, ranges]);
};

/**
 * State field that tracks highlight ranges.
 */
export const highlightStateField = StateField.define<HighlightRange[]>({
  create: () => [],
  update: (threads, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setHighlights)) {
        return effect.value;
      }
    }

    return threads;
  },
});

/**
 * Decorate ranges.
 */
// TODO(burdon): Pass in field to make reusable (e.g., comments, search).
export const highlightDecorations = EditorView.decorations.compute([highlightStateField], (state) => {
  const selectionRanges = state.field(highlightStateField);
  const decorations =
    sortBy(selectionRanges ?? [], (selection) => selection.from)?.flatMap((selection) => {
      const range = { from: selection.from, to: selection.to + 1 };
      if (selection.to > selection.from) {
        if (selection.active) {
          return marks.HighlightActive.range(range.from, range.to);
        } else {
          return marks.highlight.range(range.from, range.to);
        }
      } else {
        return [];
      }
    }) ?? [];

  return Decoration.set(decorations);
});

// TODO(burdon): Use current range to create comment.
// TODO(burdon): Allow/prevent overlapping?

export type HighlightOptions = {
  onMenu?: (el: Element) => void;
  onChange?: (active?: string) => void;
};

export const highlight = (options: HighlightOptions = {}): Extension => {
  let selection: Range | undefined;

  /**
   * Track cursor entering and existing ranges.
   */
  const listener = EditorView.updateListener.of((update) => {
    const { view, state } = update;
    const { from, to, head } = state.selection.main;

    // Set active.
    let mod = false;
    const ranges = state.field(highlightStateField);
    const newRanges = ranges.map((range) => {
      const active = head >= range.from && head <= range.to;
      if (active !== range.active) {
        mod = true;
        return { ...range, active };
      } else {
        return range;
      }
    });

    if (from !== to) {
      // TODO(burdon): Trigger tooltip.
      selection = { from, to };
    } else {
      selection = undefined;
    }

    // TODO(burdon): Modify range if editing.
    if (mod) {
      view.dispatch({ effects: setHighlights.of(newRanges) });
      options?.onChange?.(newRanges.find((range) => range.active)?.id);
    }
  });

  // TODO(burdon): Problem if near edge of viewport.
  const tooltip = hoverTooltip((view, pos) => {
    if (selection && pos >= selection.from && pos <= selection.to) {
      return {
        pos: selection.from,
        end: selection.to,
        above: true,
        create: () => {
          const el = document.createElement('div');
          el.className = tooltipContent({}, 'cursor-pointer');
          options.onMenu?.(el);
          return { dom: el, offset: { x: 0, y: 4 } };
        },
      };
    }

    return null;
  });

  return [
    //
    highlightStateField,
    highlightDecorations,
    listener,
    tooltip,
    styles,
  ];
};
