//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

const hidden = Decoration.replace({});

// Markdown image of any target: `![alt](…)`, optionally wrapped in a link (`[![alt](…)](href)`,
// common in newsletters) — the whole construct is consumed so no empty `[](href)` link is left
// behind. The target is captured so `keep` can exempt it — the capture allows an empty target, so a
// stray `![alt]()` is hidden rather than left as visible source. The linked form is listed first so it
// wins over the bare form at the same position.
const IMAGE = String.raw`!\[[^\]]*\]\(\s*([^)\s]*)[^)]*\)`;
const IMAGE_REGEXP = new RegExp(String.raw`\[${IMAGE}\]\([^)]*\)|${IMAGE}`, 'g');

/**
 * Local object references, rendered by `preview()` rather than fetched — exempt by default, since
 * hiding them would blank content that never touches the network.
 */
const isLocalRef = (url: string): boolean => /^(dxn|echo):/i.test(url);

export type HideImagesOptions = {
  /**
   * Image targets to leave in place. Everything else is omitted — including `cid:` and
   * protocol-relative targets, which would otherwise render as broken images. Defaults to
   * {@link isLocalRef}.
   */
  keep?: (url: string) => boolean;
};

// A run of three or more line breaks (i.e. more than one blank line), each optionally padded with
// horizontal whitespace. Collapsed down to a single blank line so the surplus is omitted.
const BLANK_LINES_REGEXP = /(?:\n[^\S\n]*){3,}/g;

type Range = { from: number; to: number };

/**
 * Computes the document ranges to omit when rendering an email body with image loading disabled:
 * image markdown (`![alt](url)`) whose target is not kept, and the surplus of any run of blank lines
 * (each run is collapsed to a single blank line). Blank-line collapsing operates on the text that
 * remains *after* images are removed, so the gaps that image removal opens up are collapsed too.
 * Ranges are sorted by start and non-overlapping.
 */
export const computeHiddenRanges = (text: string, keep: (url: string) => boolean = isLocalRef): Range[] => {
  // Image spans, minus any the caller keeps.
  const imageRanges: Range[] = [];
  for (const match of text.matchAll(IMAGE_REGEXP)) {
    // One capture per alternative (linked form, bare form); exactly one participates per match.
    const url = match[1] ?? match[2];
    if (url && keep(url)) {
      continue;
    }
    imageRanges.push({ from: match.index, to: match.index + match[0].length });
  }
  imageRanges.sort((a, b) => a.from - b.from);

  // Build the visible text (image spans removed) alongside a map from each visible character back
  // to its original index, so blank runs found in the visible text can be hidden in the document.
  let visible = '';
  let imageCursor = 0;
  const originalIndex: number[] = [];
  for (let index = 0; index < text.length;) {
    if (imageCursor < imageRanges.length && index === imageRanges[imageCursor].from) {
      index = imageRanges[imageCursor].to;
      imageCursor++;
      continue;
    }
    visible += text[index];
    originalIndex.push(index);
    index++;
  }

  // Collapse runs of blank lines in the visible text, mapping the surplus back to original ranges.
  const blankRanges: Range[] = [];
  for (const match of visible.matchAll(BLANK_LINES_REGEXP)) {
    const run = match[0];
    // Keep the first two line breaks (one blank line); hide everything after them in the run.
    const secondBreak = run.indexOf('\n', run.indexOf('\n') + 1);
    const runEnd = match.index + run.length;
    for (let cursor = match.index + secondBreak + 1; cursor < runEnd;) {
      // Coalesce contiguous original indices (a run is split only where a hidden image sits).
      const from = originalIndex[cursor];
      let to = from + 1;
      cursor++;
      while (cursor < runEnd && originalIndex[cursor] === to) {
        to++;
        cursor++;
      }
      blankRanges.push({ from, to });
    }
  }

  // Merge, sort, and drop overlaps so the RangeSetBuilder receives a strictly increasing,
  // non-overlapping sequence.
  const result: Range[] = [];
  let lastTo = 0;
  for (const range of [...imageRanges, ...blankRanges].sort((a, b) => a.from - b.from)) {
    if (range.from >= range.to || range.from < lastTo) {
      continue;
    }
    result.push(range);
    lastTo = range.to;
  }

  return result;
};

const buildDecorations = (text: string, keep?: (url: string) => boolean): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of computeHiddenRanges(text, keep)) {
    builder.add(from, to, hidden);
  }

  return builder.finish();
};

/**
 * Cleans up the rendered email body when image loading is disabled: completely omits image markdown
 * (`![alt](url)`) rather than leaving a broken image or the raw link visible, and collapses runs of
 * consecutive blank lines down to a single blank line. Every target is hidden except those `keep`
 * exempts — by default the local (`dxn:`/`echo:`) references that `preview()` renders without a fetch.
 *
 * Implemented as a `StateField` rather than a `ViewPlugin` because the blank-line decorations
 * replace line breaks, which CodeMirror forbids for plugin-provided decorations.
 */
export const hideImages = ({ keep }: HideImagesOptions = {}): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state.doc.toString(), keep),
    update: (decorations, transaction) =>
      transaction.docChanged ? buildDecorations(transaction.state.doc.toString(), keep) : decorations,
    provide: (field) => EditorView.decorations.from(field),
  });
