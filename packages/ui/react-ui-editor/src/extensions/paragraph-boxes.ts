//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, RectangleMarker, layer } from '@codemirror/view';

export type ParagraphBoxesOptions = {
  /** Class applied to each paragraph box element. */
  className?: string;
};

const DEFAULT_CLASS = 'cm-paragraphBox';

// Space (px) between the text bounds and the box border, applied on every side.
const BOX_PADDING = 2;

type ParagraphRange = { from: number; to: number };

/**
 * Detects paragraphs (maximal runs of consecutive non-blank lines) around the viewport.
 * The scan is extended past the viewport edges to the paragraph boundaries so a paragraph that
 * begins above or ends below the visible range is still measured in full.
 */
const findParagraphs = (view: EditorView): ParagraphRange[] => {
  const { doc } = view.state;
  const { from: viewportFrom, to: viewportTo } = view.viewport;
  const lineCount = doc.lines;
  const isBlank = (line: number) => doc.line(line).text.trim().length === 0;

  let firstLine = doc.lineAt(viewportFrom).number;
  while (firstLine > 1 && !isBlank(firstLine) && !isBlank(firstLine - 1)) {
    firstLine--;
  }
  let lastLine = doc.lineAt(viewportTo).number;
  while (lastLine < lineCount && !isBlank(lastLine) && !isBlank(lastLine + 1)) {
    lastLine++;
  }

  const paragraphs: ParagraphRange[] = [];
  let from: number | null = null;
  let to = 0;
  for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
    const line = doc.line(lineNumber);
    if (line.text.trim().length > 0) {
      from ??= line.from;
      to = line.to;
    } else if (from !== null) {
      paragraphs.push({ from, to });
      from = null;
    }
  }
  if (from !== null) {
    paragraphs.push({ from, to });
  }

  return paragraphs;
};

/**
 * Builds one full-width rectangle per visible paragraph. Coordinates are document-relative, matching
 * the frame the layer positions markers in (see `RectangleMarker`): the content DOM's top-left is the
 * document origin, so client coordinates from `coordsAtPos` are rebased onto it. Called by the layer
 * inside its measure phase, so `coordsAtPos` reads are layout-safe.
 */
const buildMarkers = (view: EditorView, className: string): RectangleMarker[] => {
  const contentRect = view.contentDOM.getBoundingClientRect();
  const markers: RectangleMarker[] = [];
  for (const paragraph of findParagraphs(view)) {
    // Clamp to the rendered viewport; `coordsAtPos` returns null for positions outside it.
    const from = Math.max(paragraph.from, view.viewport.from);
    const to = Math.min(paragraph.to, view.viewport.to);
    if (from > to) {
      continue;
    }

    const top = view.coordsAtPos(from);
    const bottom = view.coordsAtPos(to);
    if (!top || !bottom) {
      continue;
    }

    // Pad above/below the tight text bounds so the text does not touch the border. The box keeps the
    // content width (horizontal breathing room comes from the editor's own content padding); extending
    // it sideways would push the left/right borders outside the clipped layer and hide them.
    markers.push(
      new RectangleMarker(
        className,
        0,
        top.top - contentRect.top - BOX_PADDING,
        contentRect.width,
        bottom.bottom - top.top + BOX_PADDING * 2,
      ),
    );
  }

  return markers;
};

const paragraphBoxTheme = EditorView.theme({
  // The layer sits below the text (`above: false`); keep it out of the way of pointer/selection.
  '.cm-paragraphBoxLayer': {
    pointerEvents: 'none',
  },
  '.cm-paragraphBox': {
    boxSizing: 'border-box',
    borderRadius: '4px',
    border: '1px solid var(--dx-paragraphBox-border, color-mix(in srgb, currentColor 12%, transparent))',
    backgroundColor: 'var(--dx-paragraphBox-surface, color-mix(in srgb, currentColor 4%, transparent))',
  },
  '.cm-line': {
    padding: '0 8px',
  },
});

/**
 * Renders each paragraph as a non-interactive box behind the text. The document stays fully editable
 * (no text is replaced with widgets); the boxes are drawn in a below-text CodeMirror layer and are
 * re-measured on edits, scrolling, and viewport changes.
 */
export const paragraphBoxes = ({ className = DEFAULT_CLASS }: ParagraphBoxesOptions = {}): Extension => [
  paragraphBoxTheme,
  layer({
    above: false,
    class: 'cm-paragraphBoxLayer',
    update: (update) => update.docChanged || update.viewportChanged || update.geometryChanged,
    markers: (view) => buildMarkers(view, className),
  }),
];
