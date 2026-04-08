//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

// Per-type hue palette for fence header color-coding.
const BLOCK_TYPE_COLORS: Record<string, string> = {
  ext: '#b48eff', // purple
  type: '#4a9eff', // blue
  op: '#f0a050', // orange
  feat: '#4ec994', // green
  test: '#4eccd0', // teal
  component: '#f080c0', // pink
  service: '#d4c84a', // yellow
  db: '#f07070', // red
};

const FENCE_MARK_COLOR = '#555566'; // muted grey for the ``` ticks

// CSS classes injected once.
const theme = EditorView.baseTheme({
  '.cm-mdl-fence-tick': { color: FENCE_MARK_COLOR },
  '.cm-mdl-fence-name': { color: '#cccccc' },
  ...Object.fromEntries(
    Object.entries(BLOCK_TYPE_COLORS).map(([type, color]) => [`& .cm-mdl-block-${type}`, { color }]),
  ),
});

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'CodeInfo') {
        return;
      }

      // CodeInfo contains the full info string: "type name: label"
      const infoText = state.doc.sliceString(node.from, node.to);
      const spaceIdx = infoText.search(/\s/);
      const blockType = spaceIdx === -1 ? infoText : infoText.slice(0, spaceIdx);
      const color = BLOCK_TYPE_COLORS[blockType];
      if (!color) {
        return;
      }

      // Color the ``` ticks: three characters immediately before CodeInfo.
      const tickFrom = node.from - 3;
      const tickTo = node.from;
      if (tickFrom >= 0) {
        builder.add(tickFrom, tickTo, Decoration.mark({ class: 'cm-mdl-fence-tick' }));
      }

      // Color the block type word.
      const typeEnd = node.from + (spaceIdx === -1 ? infoText.length : spaceIdx);
      builder.add(node.from, typeEnd, Decoration.mark({ class: `cm-mdl-block-${blockType}` }));

      // Color the remainder (name + label) in neutral.
      if (spaceIdx !== -1) {
        builder.add(typeEnd, node.to, Decoration.mark({ class: 'cm-mdl-fence-name' }));
      }
    },
  });

  return builder.finish();
};

/**
 * Colors fenced block header lines based on block type.
 * Applies per-type hues to the type word (ext, type, op, feat, …)
 * and mutes the ``` fence ticks.
 * No grammar change required — decorates the outer Markdown syntax tree.
 */
export const mdlFenceHighlight: Extension = [
  theme,
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (instance) => instance.decorations },
  ),
];
