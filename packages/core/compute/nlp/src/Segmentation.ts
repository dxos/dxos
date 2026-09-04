//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Granularity of an analyzed region, coarse to fine. The order is load-bearing: resolving the
 * region under a pointer picks the *most specific* one covering it, and nesting is expected to
 * follow this order (a clause inside a sentence inside a paragraph).
 */
export const SegmentKind = Schema.Literals(['paragraph', 'sentence', 'clause', 'vocab']);
export type SegmentKind = Schema.Schema.Type<typeof SegmentKind>;

/** Coarse-to-fine, so a smaller index is a larger region. Used to break ties on equal extents. */
export const SEGMENT_KIND_ORDER: readonly SegmentKind[] = ['paragraph', 'sentence', 'clause', 'vocab'];

/** Half-open character range `[start, end)` within one text. */
export const Range = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
});
export interface Range extends Schema.Schema.Type<typeof Range> {}

/**
 * One analyzed region, carrying its extent in the source text and — when the analysis was run over
 * a language pair — the corresponding extent in the translation.
 *
 * The paired range is what makes cross-pane selection possible: selecting a clause in one pane can
 * highlight the same clause in the other without re-analyzing or guessing at alignment.
 */
export const Segment = Schema.Struct({
  /** Stable within one {@link Segmentation}; referenced by `parent` and by selection state. */
  id: Schema.String,
  kind: SegmentKind,
  /** Enclosing segment's id, when the analysis nested this one. */
  parent: Schema.optional(Schema.String),
  source: Range,
  /** Extent in the translation, when a paired text was analyzed. */
  target: Schema.optional(Range),
  /** Gloss for this region, when the analysis produced one (a vocab segment's translation). */
  gloss: Schema.optional(Schema.String),
  /** Dictionary form, for a vocab segment harvested inflected. */
  lemma: Schema.optional(Schema.String),
  /** Pronunciation or romanization, for a vocab segment (pinyin, furigana). */
  reading: Schema.optional(Schema.String),
});
export interface Segment extends Schema.Schema.Type<typeof Segment> {}

/**
 * A whole analyzed document.
 *
 * `sourceHash`/`targetHash` are divergence signals, not identity: a consumer compares them against
 * the live text to decide whether the offsets still mean anything (see `sourceHash`).
 */
export const Segmentation = Schema.Struct({
  sourceHash: Schema.String,
  targetHash: Schema.optional(Schema.String),
  segments: Schema.Array(Segment),
});
export interface Segmentation extends Schema.Schema.Type<typeof Segmentation> {}

/** Offset-free analyzer output, before alignment computes ranges. */
export type RawSegment = {
  readonly kind: SegmentKind;
  /** Surface text in the source, exactly as it appears. */
  readonly text: string;
  /** Corresponding surface text in the translation, when one was supplied. */
  readonly translation?: string;
  readonly gloss?: string;
  readonly lemma?: string;
  readonly reading?: string;
  /** Nested regions, expected to be finer-grained than this one. */
  readonly children?: readonly RawSegment[];
};

/** True when `inner` lies within `outer`. Equal extents count as contained. */
export const contains = (outer: Range, inner: Range): boolean => inner.start >= outer.start && inner.end <= outer.end;

/** True when `range` covers `position`. End-exclusive, so adjacent segments never both match. */
export const covers = (range: Range, position: number): boolean => position >= range.start && position < range.end;

/**
 * The most specific segment covering `position` in the source: the smallest extent, and on a tie
 * the finer kind. Returns undefined when nothing covers it.
 */
export const segmentAt = (segments: readonly Segment[], position: number): Segment | undefined => {
  let best: Segment | undefined;
  let bestExtent = Number.POSITIVE_INFINITY;
  let bestKind = -1;
  for (const segment of segments) {
    if (!covers(segment.source, position)) {
      continue;
    }

    const extent = segment.source.end - segment.source.start;
    const kind = SEGMENT_KIND_ORDER.indexOf(segment.kind);
    if (extent < bestExtent || (extent === bestExtent && kind > bestKind)) {
      best = segment;
      bestExtent = extent;
      bestKind = kind;
    }
  }

  return best;
};

/** Looks a segment up by id. */
export const findSegment = (segments: readonly Segment[], id: string): Segment | undefined =>
  segments.find((segment) => segment.id === id);
