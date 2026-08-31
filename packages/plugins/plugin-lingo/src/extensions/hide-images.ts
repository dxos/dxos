//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

const build = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'Image') {
          builder.add(node.from, node.to, Decoration.replace({}));
        }
      },
    });
  }

  return builder.finish();
};

/**
 * Removes images from the rendered text.
 *
 * `decorateMarkdown`'s `skip` only declines to render the image, which leaves the markdown source
 * visible — noise in a pane meant for reading prose. Replacing the whole node drops it entirely.
 */
export const hideImages = (): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = build(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (value) => value.decorations },
  );
