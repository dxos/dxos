//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, hoverTooltip } from '@codemirror/view';

import { type Range, type Segment, type Segmentation, segmentAt, sourceHash } from '@dxos/nlp';
import { type RenderCallback } from '@dxos/ui-editor/types';

/**
 * Which text this editor holds. A segment carries a range on each side, so the same segment id
 * addresses the corresponding text in either pane — this is what lets a selection made in the
 * source highlight its counterpart in the translation.
 */
export type SegmentSide = 'source' | 'target';

/** The segment's range on this side, or undefined when the analysis found no counterpart. */
export const rangeOn = (segment: Segment, side: SegmentSide): Range | undefined =>
  side === 'source' ? segment.source : segment.target;

export type SegmentTooltipProps = {
  segment: Segment;
  /** The segment's text as it appears in this editor. */
  text: string;
  /** The enclosing sentence, for context-sensitive translation of a short span. */
  context: string;
};

export type SegmentsOptions = {
  side?: SegmentSide;
  /** Renders the popover for the active segment; omitted, no popover is shown. */
  render?: RenderCallback<SegmentTooltipProps>;
  /** Notified when the active segment changes, so the container can sync the other pane. */
  onSelect?: (segment: Segment | undefined) => void;
  /** Notified on click, for operations that act on the selection (e.g. add phrase to deck). */
  onActivate?: (segment: Segment) => void;
};

/** The analysis held by one editor, plus the divergence signal for the text it describes. */
export type SegmentsState = {
  segments: readonly Segment[];
  /** Hash of the text the ranges were computed against. */
  hash: string;
  /** True once the editor text diverged from `hash`; decorations render dimmed. */
  stale: boolean;
  /** Segment under the pointer or cursor. */
  hovered?: string;
  /** Segment the user committed to by clicking, or that was set from the other pane. */
  selected?: string;
};

const EMPTY: SegmentsState = { segments: [], hash: '', stale: false };

/** Replace the analysis for this editor. */
export const setSegments = StateEffect.define<{ segments: readonly Segment[]; hash: string }>();

/** Drop the analysis and any selection. */
export const clearSegments = StateEffect.define<null>();

/** Set (or clear) the segment under the pointer/cursor. */
export const setHovered = StateEffect.define<string | undefined>();

/**
 * Set (or clear) the committed segment. Dispatched by a click here, and by the container when the
 * *other* pane's selection changed — which is how the two panes stay in step.
 */
export const setSelected = StateEffect.define<string | undefined>();

/**
 * Segment state for one editor.
 *
 * Ranges are NOT mapped through document changes: unlike a single anchor, a whole analysis stops
 * being meaningful once the text moves, so divergence is detected by hash and the decorations dim
 * until a fresh analysis arrives. Mapping would silently keep confident-looking boundaries over
 * text they no longer describe.
 */
export const segmentsField = StateField.define<SegmentsState>({
  create: () => EMPTY,
  update: (state, tr) => {
    let next = state;

    for (const effect of tr.effects) {
      if (effect.is(setSegments)) {
        next = { segments: effect.value.segments, hash: effect.value.hash, stale: false };
      } else if (effect.is(clearSegments)) {
        next = EMPTY;
      } else if (effect.is(setHovered)) {
        next = { ...next, hovered: effect.value };
      } else if (effect.is(setSelected)) {
        next = { ...next, selected: effect.value };
      }
    }

    if (tr.docChanged && next.segments.length > 0 && !next.stale) {
      next = { ...next, stale: sourceHash(tr.state.doc.toString()) !== next.hash };
    }

    return next;
  },
});

/** Read the current segment state. */
export const segmentsState = (state: EditorState): SegmentsState => state.field(segmentsField, false) ?? EMPTY;

/** The segment covering `position` on this side, most specific first. */
export const segmentAtPosition = (state: EditorState, position: number, side: SegmentSide): Segment | undefined => {
  const { segments } = segmentsState(state);
  if (side === 'source') {
    return segmentAt(segments, position);
  }

  // Reuse the same most-specific rule on the target side by projecting onto `source`.
  const projected = segments
    .filter((segment) => segment.target)
    .map((segment) => ({ ...segment, source: segment.target! }));
  const hit = segmentAt(projected, position);
  return hit && segments.find((segment) => segment.id === hit.id);
};

const vocabMark = (stale: boolean) =>
  Decoration.mark({ class: ['cm-segment', 'cm-segment-vocab', stale && 'cm-segment-stale'].filter(Boolean).join(' ') });

const hoverMark = (kind: string) => Decoration.mark({ class: `cm-segment cm-segment-hover cm-segment-${kind}` });

const selectedMark = (kind: string) => Decoration.mark({ class: `cm-segment cm-segment-selected cm-segment-${kind}` });

/**
 * Decorations from segment state.
 *
 * Marks are emitted in start order because `RangeSetBuilder` requires it; the hover and selection
 * marks are added last at the same positions so they layer over the vocabulary underline.
 */
const decorations = (side: SegmentSide) =>
  EditorView.decorations.compute([segmentsField], (state) => {
    const { segments, stale, hovered, selected } = state.field(segmentsField);
    const marks: Array<{ from: number; to: number; deco: Decoration; order: number }> = [];

    const push = (segment: Segment, deco: Decoration, order: number) => {
      const range = rangeOn(segment, side);
      if (!range || range.end > state.doc.length || range.start >= range.end) {
        return;
      }
      marks.push({ from: range.start, to: range.end, deco, order });
    };

    for (const segment of segments) {
      if (segment.kind === 'vocab') {
        push(segment, vocabMark(stale), 0);
      }
    }

    const hoveredSegment = hovered && segments.find((segment) => segment.id === hovered);
    if (hoveredSegment && hoveredSegment.id !== selected) {
      push(hoveredSegment, hoverMark(hoveredSegment.kind), 1);
    }

    const selectedSegment = selected && segments.find((segment) => segment.id === selected);
    if (selectedSegment) {
      push(selectedSegment, selectedMark(selectedSegment.kind), 2);
    }

    marks.sort((a, b) => a.from - b.from || a.order - b.order || a.to - b.to);
    const builder = new RangeSetBuilder<Decoration>();
    for (const mark of marks) {
      builder.add(mark.from, mark.to, mark.deco);
    }
    return builder.finish();
  });

/**
 * Pointer and cursor tracking.
 *
 * Both drive the same `hovered` state: moving the mouse and moving the caret are two ways of
 * asking "what is under me", and the reader should answer identically for either.
 */
const tracking = (side: SegmentSide, { onSelect, onActivate }: SegmentsOptions): Extension => [
  EditorView.domEventHandlers({
    mousemove: (event, view) => {
      const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
      const segment = position === null ? undefined : segmentAtPosition(view.state, position, side);
      if (segmentsState(view.state).hovered !== segment?.id) {
        view.dispatch({ effects: setHovered.of(segment?.id) });
      }
      return false;
    },
    mouseleave: (_event, view) => {
      if (segmentsState(view.state).hovered !== undefined) {
        view.dispatch({ effects: setHovered.of(undefined) });
      }
      return false;
    },
    // A click commits the hovered segment. This is a selection in its own right, distinct from the
    // text selection CodeMirror maintains, so it survives the caret moving on.
    mousedown: (event, view) => {
      const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
      const segment = position === null ? undefined : segmentAtPosition(view.state, position, side);
      view.dispatch({ effects: setSelected.of(segment?.id) });
      onSelect?.(segment);
      if (segment) {
        onActivate?.(segment);
      }
      return false;
    },
  }),
  EditorView.updateListener.of((update) => {
    if (!update.selectionSet || update.docChanged) {
      return;
    }
    const segment = segmentAtPosition(update.state, update.state.selection.main.head, side);
    if (segmentsState(update.state).hovered !== segment?.id) {
      update.view.dispatch({ effects: setHovered.of(segment?.id) });
    }
  }),
];

/** Popover for the segment under the pointer. */
const popover = (side: SegmentSide, render: NonNullable<SegmentsOptions['render']>): Extension =>
  hoverTooltip((view, position) => {
    const segment = segmentAtPosition(view.state, position, side);
    const range = segment && rangeOn(segment, side);
    if (!segment || !range) {
      return null;
    }

    return {
      pos: range.start,
      end: range.end,
      above: true,
      create: () => {
        const el = document.createElement('div');
        render(
          el,
          {
            segment,
            text: view.state.doc.sliceString(range.start, range.end),
            context: view.state.doc.lineAt(range.start).text,
          },
          view,
        );
        return { dom: el, offset: { x: 0, y: 4 } };
      },
    };
  });

/**
 * Structural selection over an analyzed document.
 *
 * As the pointer or caret moves, the most specific analyzed range under it is outlined; clicking
 * commits it. That committed segment is a second kind of selection alongside CodeMirror's text
 * selection — it addresses a linguistic unit rather than a character range, which is what lets the
 * toolbar act on "this clause" and what the other pane mirrors.
 */
export const segments = (options: SegmentsOptions = {}): Extension => {
  const { side = 'source', render } = options;
  const extensions: Extension[] = [segmentsField, decorations(side), tracking(side, options), segmentTheme];
  if (render) {
    extensions.push(popover(side, render));
  }

  return extensions;
};

/** Applies a whole segmentation to an editor, choosing the side's hash for divergence. */
export const applySegmentation = (view: EditorView, segmentation: Segmentation, side: SegmentSide = 'source'): void => {
  view.dispatch({
    effects: setSegments.of({
      segments: segmentation.segments,
      hash: (side === 'source' ? segmentation.sourceHash : segmentation.targetHash) ?? '',
    }),
  });
};

const segmentTheme = EditorView.theme({
  '.cm-segment-vocab': {
    textDecoration: 'underline dotted',
    textUnderlineOffset: '4px',
    cursor: 'help',
  },
  // An outline rather than a fill: the reader is still reading, and a highlight block over running
  // text competes with it far more than a border does. The colour must come from a text-weight
  // token, not a surface one — a surface token is a background fill and disappears against the
  // editor's own background.
  '.cm-segment-hover': {
    outline: '1px solid var(--color-subdued)',
    outlineOffset: '1px',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  // The committed segment earns more weight than the one merely under the pointer.
  '.cm-segment-selected': {
    outline: '1px solid var(--color-accent-text)',
    outlineOffset: '1px',
    backgroundColor: 'var(--color-current-surface)',
    borderRadius: '2px',
  },
  '.cm-segment-stale': {
    opacity: '0.4',
  },
});
