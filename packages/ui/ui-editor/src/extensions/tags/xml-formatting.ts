//
// Copyright 2026 DXOS.org
//

import { xmlLanguage } from '@codemirror/lang-xml';
import { type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/**
 * Well-formed XML tag name (a stray `<` in prose — e.g. `a < b` — has none, so it stays undecorated).
 */
const VALID_TAG_NAME = /^[A-Za-z_][\w.-]*$/;

const xmlElementMark = Decoration.mark({ class: 'cm-xml-element' });
const xmlTagMark = Decoration.mark({ class: 'cm-xml-tag' });
const xmlContentMark = Decoration.mark({ class: 'cm-xml-content' });

export type XmlFormattingOptions = {
  /**
   * Tag names whose elements should NOT receive xmlFormatting decorations. Use to
   * opt-out tags rendered by another extension (e.g. `xmlBlockDecoration` for `<prompt>`)
   * so the two don't double-wrap the same content with stacked styling.
   *
   * Skipping is recursive: descendants of a skipped element are also untouched, so a
   * `<foo>` inside a skipped `<prompt>` still appears literally without xmlFormatting
   * styling.
   */
  skip?: string[];
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
export const xmlFormatting = ({ skip }: XmlFormattingOptions = {}): Extension => {
  const skipSet = skip && skip.length > 0 ? new Set(skip) : undefined;

  const buildDecorations = (view: EditorView): DecorationSet => {
    const text = view.state.sliceDoc(0, view.state.doc.length);
    if (!text.includes('<')) {
      return Decoration.none;
    }

    const tagNameAt = (node: { from: number; to: number }) => text.slice(node.from, node.to);
    // A tag is only decorated when its `TagName` child parses as a real name. This gates out the
    // malformed elements Lezer synthesises from a stray `<` in prose, which would otherwise span
    // to the next `>` and paint the intervening text with `cm-xml-element`/`cm-xml-tag`.
    const tagNameOf = (tagNode: { getChild: (name: string) => { from: number; to: number } | null }) => {
      const tagNameNode = tagNode.getChild('TagName');
      if (!tagNameNode) {
        return undefined;
      }
      const value = tagNameAt(tagNameNode);
      return VALID_TAG_NAME.test(value) ? value : undefined;
    };

    const tree = xmlLanguage.parser.parse(text);
    const ranges: Range<Decoration>[] = [];
    tree.iterate({
      enter: (node) => {
        const name = node.type.name;
        if (name === 'SelfClosingTag' && node.from < node.to) {
          const tagName = tagNameOf(node.node);
          if (!tagName) {
            return;
          }
          if (skipSet?.has(tagName)) {
            return false;
          }
          // Self-closing tag is its own outer block and tag delimiter.
          ranges.push(xmlElementMark.range(node.from, node.to));
          ranges.push(xmlTagMark.range(node.from, node.to));
          return;
        }
        if (name === 'Element' && node.from < node.to) {
          const openTag = node.node.getChild('OpenTag');
          // Require a real matching `CloseTag` (not `MismatchedCloseTag`) with a valid name: an
          // unterminated or malformed element is left undecorated. Keep descending so any
          // well-formed nested elements still get styled.
          const closeTag = node.node.getChild('CloseTag');
          const tagName = openTag ? tagNameOf(openTag) : undefined;
          if (!openTag || !closeTag || !tagName) {
            return;
          }
          if (skipSet?.has(tagName)) {
            // Skip this element AND its descendants — another extension owns rendering.
            return false;
          }
          ranges.push(xmlElementMark.range(node.from, node.to));
          ranges.push(xmlTagMark.range(openTag.from, openTag.to));
          ranges.push(xmlTagMark.range(closeTag.from, closeTag.to));
          if (openTag.to < closeTag.from) {
            ranges.push(xmlContentMark.range(openTag.to, closeTag.from));
          }
        }
      },
    });
    return Decoration.set(ranges, true);
  };

  return [
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
        backgroundColor: 'var(--color-current-surface)',
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
};
