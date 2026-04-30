//
// Copyright 2026 DXOS.org
//

import { xmlLanguage } from '@codemirror/lang-xml';
import { type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/**
 * Lezer XML node names that represent the angle-bracket delimited portions of an element.
 */
const XML_TAG_NODES = new Set(['OpenTag', 'CloseTag', 'SelfClosingTag', 'MismatchedCloseTag']);

const xmlElementMark = Decoration.mark({ class: 'cm-xml-element' });
const xmlTagMark = Decoration.mark({ class: 'cm-xml-tag' });
const xmlContentMark = Decoration.mark({ class: 'cm-xml-content' });

/**
 * Parses the document with the Lezer XML parser and emits mark decorations
 * for the outer element, tag delimiters, and inner content. Non-XML text
 * becomes a top-level `Text` node and is ignored. Nested elements produce
 * nested `cm-xml-element` wrappers.
 */
const buildDecorations = (view: EditorView): DecorationSet => {
  const text = view.state.sliceDoc(0, view.state.doc.length);
  if (!text.includes('<')) {
    return Decoration.none;
  }

  const tree = xmlLanguage.parser.parse(text);
  const ranges: Range<Decoration>[] = [];
  tree.iterate({
    enter: (node) => {
      const name = node.type.name;
      if (name === 'SelfClosingTag' && node.from < node.to) {
        // Self-closing tag is its own outer block and tag delimiter.
        ranges.push(xmlElementMark.range(node.from, node.to));
        ranges.push(xmlTagMark.range(node.from, node.to));
        return;
      }
      if (XML_TAG_NODES.has(name) && node.from < node.to) {
        ranges.push(xmlTagMark.range(node.from, node.to));
        return;
      }
      if (name === 'Element' && node.from < node.to) {
        ranges.push(xmlElementMark.range(node.from, node.to));
        const openTag = node.node.getChild('OpenTag');
        const closeTag = node.node.getChild('CloseTag') ?? node.node.getChild('MismatchedCloseTag');
        if (openTag && closeTag && openTag.to < closeTag.from) {
          ranges.push(xmlContentMark.range(openTag.to, closeTag.from));
        }
      }
    },
  });
  return Decoration.set(ranges, true);
};

/**
 * Mark decoration extension that highlights XML tag delimiters
 * (e.g., `<tag>`, `</tag>`, `<tag attr="x"/>`) with the `cm-xml-tag` class.
 *
 * Uses `@codemirror/lang-xml`'s Lezer parser standalone — only to compute
 * decoration ranges — without changing the editor's primary language. This
 * keeps the document plain text while still handling nesting and attributes
 * correctly.
 */
export const xmlFormatting = (): Extension => [
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
  ),

  EditorView.baseTheme({
    '.cm-xml-element': {
      backgroundColor: 'var(--color-group-surface)',
      borderRadius: '0.25rem',
      padding: '0.25rem',
    },
    '.cm-xml-tag': {
      color: 'var(--color-blue-500)',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-xml-content': {},
  }),
];
