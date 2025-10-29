//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

export type XmlOptions = {};

/**
 * XML decorator plugin for CodeMirror.
 * Decorates XML tags with monospace font using the XML language grammar.
 */
export const xmlDecorator = (_: XmlOptions = {}): Extension => {
  return [xmlDecoratorPlugin];
};

/**
 * ViewPlugin that decorates XML tags using syntax tree.
 */
const xmlDecoratorPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            // Decorate XML elements (opening tags, closing tags, self-closing tags).
            if (
              node.name === 'HTMLTag' ||
              node.name === 'OpenTag' ||
              node.name === 'CloseTag' ||
              node.name === 'SelfClosingTag' ||
              node.name === 'Element'
            ) {
              builder.add(node.from, node.to, Decoration.mark({ class: 'font-mono' }));
            }
          },
        });
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
