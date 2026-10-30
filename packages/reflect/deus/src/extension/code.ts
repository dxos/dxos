//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { highlightTree, tagHighlighter, tags } from '@lezer/highlight';

/** Fences that other extensions colour, or that have no nested language. */
const SKIPPED_FENCES = new Set(['', 'mdl', 'diagram', 'mermaid']);

const highlighter = tagHighlighter([
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
      tags.operatorKeyword,
      tags.modifier,
    ],
    class: 'cm-code-keyword',
  },
  { tag: [tags.string, tags.special(tags.string), tags.regexp, tags.escape], class: 'cm-code-string' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], class: 'cm-code-literal' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], class: 'cm-code-comment' },
  { tag: [tags.typeName, tags.className, tags.namespace], class: 'cm-code-type' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], class: 'cm-code-function' },
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], class: 'cm-code-property' },
]);

// The markdown highlight style sets code tokens to `color: inherit !important`, so a mark's colour shows through.
const theme = EditorView.baseTheme({
  '.cm-code-keyword': { color: 'var(--color-violet-400)' },
  '.cm-code-string': { color: 'var(--color-emerald-400)' },
  '.cm-code-literal': { color: 'var(--color-orange-400)' },
  '.cm-code-comment': { color: 'var(--color-slate-400)', fontStyle: 'italic' },
  '.cm-code-type': { color: 'var(--color-sky-400)' },
  '.cm-code-function': { color: 'var(--color-amber-400)' },
  '.cm-code-property': { color: 'var(--color-blue-400)' },
});

const fenceLanguage = (state: EditorState, from: number, to: number): string =>
  state.sliceDoc(from, to).trim().split(/\s/)[0].toLowerCase();

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(view.state);
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'FencedCode') {
          return;
        }
        const info = node.node.getChild('CodeInfo');
        const text = node.node.getChild('CodeText');
        if (text && !SKIPPED_FENCES.has(info ? fenceLanguage(view.state, info.from, info.to) : '')) {
          highlightTree(
            tree,
            highlighter,
            (start, end, cls) => builder.add(start, end, Decoration.mark({ class: cls })),
            Math.max(text.from, from),
            Math.min(text.to, to),
          );
        }
        return false;
      },
    });
  }
  return builder.finish();
};

/**
 * Colours the fenced code of other languages (`ts`, `sql`, …) in a spec, whose tokens the markdown
 * highlight style leaves uncoloured.
 */
export const codeFenceHighlight: Extension = [
  theme,
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        // A fence language loads after the first parse, which changes the tree without changing the doc.
        if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
];
