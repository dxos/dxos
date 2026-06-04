//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

const hidden = Decoration.replace({});

// Markdown image with a remote (http/https) target: `![alt](https://…)`. dxn: images are left
// alone (handled by preview()); only remote images are suppressed when image loading is disabled.
const REMOTE_IMAGE_REGEXP = /!\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)[^)]*\)/g;

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  for (const match of text.matchAll(REMOTE_IMAGE_REGEXP)) {
    const from = match.index;
    builder.add(from, from + match[0].length, hidden);
  }

  return builder.finish();
};

/**
 * Completely omits remote (http/https) image markdown (`![alt](url)`) from the rendered output,
 * rather than leaving the raw markdown link visible. Used when remote-image loading is disabled.
 */
export const hideRemoteImages = (): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations,
    },
  );
