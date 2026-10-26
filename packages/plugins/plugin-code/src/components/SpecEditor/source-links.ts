//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type SourceKey, findSourceKeys } from '#sync';

const LINK = Decoration.mark({
  class: 'underline decoration-dotted underline-offset-2 text-accent-text cursor-pointer',
  attributes: { 'title': 'Ctrl/⌘-click to open', 'data-testid': 'spec-editor.source-link' },
});

const decorate = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    // Widen to whole lines so a key that straddles the edge of the visible range is still found.
    const start = view.state.doc.lineAt(from).from;
    const text = view.state.doc.sliceString(start, view.state.doc.lineAt(to).to);
    for (const match of findSourceKeys(text)) {
      builder.add(start + match.from, start + match.to, LINK);
    }
  }
  return builder.finish();
};

/** The key under a document position, if any. */
const keyAt = (view: EditorView, pos: number): SourceKey | undefined => {
  const line = view.state.doc.lineAt(pos);
  const offset = pos - line.from;
  return findSourceKeys(line.text).find(({ from, to }) => offset >= from && offset <= to)?.key;
};

/**
 * Underlines every `github:` key in the spec and opens it on Ctrl/⌘-click (the IDE gesture for go-to-definition), so a
 * spec reads as a hyperlinked map of the specs and code it names.
 */
export const sourceLinks = (onOpen: (key: SourceKey) => void): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorate(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = decorate(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
  EditorView.domEventHandlers({
    mousedown: (event, view) => {
      if (!(event.ctrlKey || event.metaKey) || event.button !== 0) {
        return false;
      }
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      const key = pos !== null ? keyAt(view, pos) : undefined;
      if (!key) {
        return false;
      }
      event.preventDefault();
      onOpen(key);
      return true;
    },
  }),
];
