//
// Copyright 2026 DXOS.org
//

import { sourceHash } from './hash';
import { type Range, type RawSegment, type Segment, type Segmentation } from './Segmentation';

/**
 * Scans a text forward, never re-matching earlier ground. Two runs over the same text with the
 * same needles therefore map repeated surface forms to successive occurrences, which is the whole
 * reason offsets are computed here rather than asked of the model — a model cannot count
 * characters reliably, but it can quote text verbatim.
 */
class Cursor {
  #position = 0;

  constructor(private readonly _text: string) {}

  /** Advances past `needle` and returns its range, or undefined when it is not found ahead. */
  take(needle: string, limit = this._text.length): Range | undefined {
    if (needle.length === 0) {
      return undefined;
    }

    const start = this._text.indexOf(needle, this.#position);
    if (start < 0 || start + needle.length > limit) {
      return undefined;
    }

    const end = start + needle.length;
    this.#position = end;
    return { start, end };
  }

  /** Rewinds so a nested pass can re-scan a region its parent already consumed. */
  seek(position: number): void {
    this.#position = position;
  }
}

/**
 * Aligns offset-free analyzer output against the source (and, when supplied, the translation) to
 * compute exact character ranges.
 *
 * Children are aligned within their parent's extent, so a clause is located inside its own
 * sentence rather than wherever that wording first happens to occur in the document. A segment
 * whose text cannot be found is dropped along with its children: a hallucinated quote has no
 * position, and keeping it would put a decoration over unrelated text.
 */
export const alignSegments = (source: string, raw: readonly RawSegment[], target?: string): Segmentation => {
  const segments: Segment[] = [];
  const sourceCursor = new Cursor(source);
  const targetCursor = target === undefined ? undefined : new Cursor(target);
  let nextId = 0;

  const walk = (entries: readonly RawSegment[], bounds: Range, targetBounds: Range | undefined, parent?: string) => {
    // Once for the whole sibling run, not once per entry: siblings are ordered and non-overlapping,
    // so each starts where the last ended. Re-seeking per entry defeats the cursor's only job —
    // repeated wording ("Go. Go.") would map every sibling onto the first occurrence.
    sourceCursor.seek(bounds.start);
    if (targetCursor && targetBounds) {
      targetCursor.seek(targetBounds.start);
    }

    for (const entry of entries) {
      const range = sourceCursor.take(entry.text, bounds.end);
      if (!range) {
        continue;
      }

      // The translation is aligned independently: the analyzer quotes both sides, and a missing or
      // unquotable counterpart degrades to a source-only segment rather than dropping the segment.
      //
      // Forward first, then rewound: a translation reorders siblings freely, so a forward-only scan
      // would drop the pairing whenever the target puts them in a different order than the source.
      let targetRange: Range | undefined;
      if (targetCursor && targetBounds && entry.translation) {
        targetRange = targetCursor.take(entry.translation, targetBounds.end);
        if (!targetRange) {
          targetCursor.seek(targetBounds.start);
          targetRange = targetCursor.take(entry.translation, targetBounds.end);
        }
      }

      const id = `s${nextId++}`;
      segments.push({
        id,
        kind: entry.kind,
        parent,
        source: range,
        target: targetRange,
        gloss: entry.gloss,
        lemma: entry.lemma,
        reading: entry.reading,
      });

      if (entry.children?.length) {
        walk(entry.children, range, targetRange, id);
        // The nested walk left both cursors somewhere inside this entry; the next sibling begins
        // after it, so hand the parent's position back rather than rescanning its own children.
        sourceCursor.seek(range.end);
        if (targetCursor && targetRange) {
          targetCursor.seek(targetRange.end);
        }
      }
    }
  };

  walk(raw, { start: 0, end: source.length }, target === undefined ? undefined : { start: 0, end: target.length });

  return {
    sourceHash: sourceHash(source),
    targetHash: target === undefined ? undefined : sourceHash(target),
    segments,
  };
};
