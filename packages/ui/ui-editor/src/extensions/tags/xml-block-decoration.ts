//
// Copyright 2026 DXOS.org
//

import { xmlLanguage } from '@codemirror/lang-xml';
import { type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

export type XmlBlockDecorationOptions = {
  /**
   * Tag name to match (e.g. `'prompt'`).
   */
  tag: string;

  /**
   * Class added via `Decoration.line` to each line that intersects the element's content
   * range. Use to style the bubble container (e.g. flex alignment, vertical margin).
   */
  lineClass?: string;

  /**
   * Class added via `Decoration.mark` covering the inner content (between the open and
   * close tags). Use to style the bubble surface (background, padding, rounding).
   */
  contentClass?: string;

  /**
   * When true, the open and close tag delimiters are hidden via `Decoration.replace`
   * with no widget, so the rendered text is the inner content only.
   */
  hideTags?: boolean;
};

/**
 * Walks the doc with the Lezer XML parser and decorates `<tag>…</tag>` elements without
 * replacing them with a widget — the source text remains in the document and can still
 * be matched by other extensions (e.g. `xmlFormatting`). Use this for "bubble"-style
 * styling of XML blocks (chat prompts, callouts, etc.) where the inner content should
 * stay editable/copyable rather than living inside a CodeMirror widget.
 */
export const xmlBlockDecoration = ({
  tag,
  lineClass,
  contentClass,
  hideTags,
}: XmlBlockDecorationOptions): Extension => {
  const lineDecoration = lineClass ? Decoration.line({ class: lineClass }) : undefined;
  const contentDecoration = contentClass ? Decoration.mark({ class: contentClass }) : undefined;
  const hideDecoration = hideTags ? Decoration.replace({}) : undefined;

  const buildDecorations = (view: EditorView): DecorationSet => {
    const text = view.state.sliceDoc(0, view.state.doc.length);
    if (!text.includes(`<${tag}`)) {
      return Decoration.none;
    }

    const tree = xmlLanguage.parser.parse(text);
    const ranges: Range<Decoration>[] = [];
    tree.iterate({
      enter: (node) => {
        if (node.type.name !== 'Element') {
          return;
        }
        const openTag = node.node.getChild('OpenTag');
        const closeTag = node.node.getChild('CloseTag') ?? node.node.getChild('MismatchedCloseTag');
        const tagNameNode = openTag?.getChild('TagName');
        if (!openTag || !tagNameNode) {
          return;
        }
        if (text.slice(tagNameNode.from, tagNameNode.to) !== tag) {
          return;
        }

        const contentFrom = openTag.to;
        const contentTo = closeTag?.from ?? node.node.to;

        if (hideDecoration) {
          ranges.push(hideDecoration.range(openTag.from, openTag.to));
          if (closeTag) {
            ranges.push(hideDecoration.range(closeTag.from, closeTag.to));
          }
        }

        if (contentDecoration && contentFrom < contentTo) {
          ranges.push(contentDecoration.range(contentFrom, contentTo));
        }

        if (lineDecoration && contentFrom <= view.state.doc.length) {
          // Apply line decoration to every line that intersects the content range.
          let pos = contentFrom;
          while (pos <= contentTo && pos <= view.state.doc.length) {
            const line = view.state.doc.lineAt(pos);
            ranges.push(lineDecoration.range(line.from));
            if (line.to >= contentTo) {
              break;
            }
            pos = line.to + 1;
          }
        }
      },
    });
    return Decoration.set(ranges, true);
  };

  return ViewPlugin.fromClass(
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
};
