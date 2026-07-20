//
// Copyright 2026 DXOS.org
//

import { type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { escapeRegExpSource } from '../../../util';

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
   * Additional class added only to the first line of the content range. Use to round the top
   * of a block bubble and pad its top edge (single line receives both first and last classes).
   */
  firstLineClass?: string;

  /**
   * Additional class added only to the last line of the content range. Use to round the
   * bottom of a block bubble and pad its bottom edge.
   */
  lastLineClass?: string;

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
 * Scans the doc for `<tag>…</tag>` blocks and decorates them without replacing them with a
 * widget — the source text remains in the document and can still be matched by other extensions
 * (e.g. `xmlFormatting`). Use this for "bubble"-style styling of XML blocks (chat prompts,
 * callouts, etc.) where the inner content should stay editable/copyable rather than living inside
 * a CodeMirror widget.
 *
 * Matching is done by direct text scan rather than a full-document XML parse: the transcript is
 * mostly markdown, and a single stray `<` anywhere upstream (code, `a < b`, an unclosed streaming
 * widget tag) corrupts a whole-document XML parse — which previously caused a well-formed prompt's
 * `</tag>` to go unrecognised, extending the bubble over the rest of the conversation. An
 * unterminated open tag (no matching `</tag>`, e.g. mid-stream) is left undecorated rather than
 * painting to the end of the document.
 */
// TODO(burdon): Change to array to support multiple tags.
export const xmlBlockDecoration = ({
  tag,
  lineClass,
  firstLineClass,
  lastLineClass,
  contentClass,
  hideTags,
}: XmlBlockDecorationOptions): Extension => {
  const contentDecoration = contentClass ? Decoration.mark({ class: contentClass }) : undefined;
  const hideDecoration = hideTags ? Decoration.replace({}) : undefined;

  // Match an opening `<tag>` or `<tag …attrs>` (not self-closing); the paired `</tag>` is located
  // by scanning forward so unrelated markup between blocks cannot break matching. `tag` is escaped
  // so a name containing regex metacharacters (e.g. `foo.bar`) matches literally.
  const escapedTag = escapeRegExpSource(tag);
  const openTagRegExp = new RegExp(`<${escapedTag}(?:\\s[^>]*)?>`, 'g');
  const closeTagStr = `</${tag}>`;

  const buildDecorations = (view: EditorView): DecorationSet => {
    const docLength = view.state.doc.length;
    const text = view.state.sliceDoc(0, docLength);
    if (!text.includes(`<${tag}`)) {
      return Decoration.none;
    }

    const ranges: Range<Decoration>[] = [];
    openTagRegExp.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = openTagRegExp.exec(text))) {
      const openFrom = match.index;
      const openTo = openFrom + match[0].length;
      const closeFrom = text.indexOf(closeTagStr, openTo);
      // Skip unterminated blocks: extending decoration to the document end would paint the bubble
      // over everything that follows (e.g. the assistant response streaming in after the prompt).
      if (closeFrom === -1) {
        break;
      }
      const closeTo = closeFrom + closeTagStr.length;
      const contentFrom = openTo;
      const contentTo = closeFrom;

      if (hideDecoration) {
        ranges.push(hideDecoration.range(openFrom, openTo));
        ranges.push(hideDecoration.range(closeFrom, closeTo));
      }

      if (contentDecoration && contentFrom < contentTo) {
        ranges.push(contentDecoration.range(contentFrom, contentTo));
      }

      if (lineClass || firstLineClass || lastLineClass) {
        // Collect every line that intersects the content range so that the first and last
        // can be styled distinctly (e.g. rounding the top/bottom of a single block bubble).
        const lines = [];
        let pos = contentFrom;
        while (pos < contentTo && pos <= docLength) {
          const line = view.state.doc.lineAt(pos);
          // Only lines that intersect visible content: a hidden close tag on its own line would
          // otherwise get an empty rounded bubble line after the tag is replaced.
          if (line.to > contentFrom && line.from < contentTo) {
            lines.push(line);
          }
          if (line.to >= contentTo) {
            break;
          }
          pos = line.to + 1;
        }

        lines.forEach((line, index) => {
          const cls = [lineClass, index === 0 && firstLineClass, index === lines.length - 1 && lastLineClass]
            .filter(Boolean)
            .join(' ');
          if (cls) {
            ranges.push(Decoration.line({ class: cls }).range(line.from));
          }
        });
      }

      // Resume scanning past the close tag so content is never re-matched.
      openTagRegExp.lastIndex = closeTo;
    }

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
