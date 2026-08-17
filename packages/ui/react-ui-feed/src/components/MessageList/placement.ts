//
// Copyright 2026 DXOS.org
//

/**
 * Where the rows go, in one number each.
 *
 * Scalars only — `start`, `extent`, `viewport` — never `top` or `height`, so the axis is the DOM
 * binding's business and never gets baked in here (§9). No DOM, no React, no CodeMirror: everything
 * this decides can be decided from arithmetic, and everything it cannot decide is a measurement
 * somebody hands it.
 *
 * The model is one authoritative fact and derivations from it: an **anchor**, identified by message
 * id, whose absolute position in content space is known. Every other row's position is that position
 * plus or minus the extents in between. Prepending rows does not move the anchor, so it does not move
 * anything at or after it — which is the property §7 needs and the reason this is not a prefix sum
 * from index 0.
 */
export type Extents = {
  /** Extent along the scroll axis of the row at `index`, when nothing has been measured for it. */
  of: (index: number) => number;
  /**
   * Never revised by measurement.
   *
   * The layout constrains the extent — a horizontal feed of declared-width items, a list of
   * fixed-height rows — so offsets are an exact prefix sum and there is nothing to correct. It does
   * **not** mean unchecked: the binding still measures in dev and reports a mismatch (§8).
   */
  exact?: boolean;
};

export type PlacementOptions = {
  count: number;
  /** Identity of the row at `index`. Extents are stored against this, so a prepend cannot shift them. */
  getId: (index: number) => string;
  extents: Extents;
  /** Extent of the visible region along the scroll axis. */
  viewport: number;
  /** Rows to mount beyond the visible region, each side. */
  overscan?: number;
};

/** The mounted range and where its parent goes. */
export type Window = {
  /** First and last mounted row, inclusive. */
  first: number;
  last: number;
  /** Absolute position of the first mounted row: what the parent is translated by (§7). */
  offset: number;
  /** Total extent of the scrollable content, which is what the thumb is computed from. */
  sizerExtent: number;
};

/** What reaching an edge revealed about the estimates, when it revealed anything. */
export type EdgeDrift = {
  edge: 'start' | 'end';
  /** How far out the estimate was. Positive means the region was shorter than assumed. */
  delta: number;
};

const DEFAULT_OVERSCAN = 8;

export class Placement {
  #count: number;
  #getId: (index: number) => string;
  #extents: Extents;
  #viewport: number;
  #overscan: number;

  /** Measured extents by message id, so that reordering the model cannot invalidate them. */
  readonly #measured = new Map<string, number>();

  /** The one authoritative position: this row starts exactly here. */
  #anchor: { id: string; index: number; start: number };

  #scroll = 0;

  constructor({ count, getId, extents, viewport, overscan = DEFAULT_OVERSCAN }: PlacementOptions) {
    this.#count = count;
    this.#getId = getId;
    this.#extents = extents;
    this.#viewport = viewport;
    this.#overscan = overscan;
    this.#anchor = { id: count ? getId(0) : '', index: 0, start: 0 };
  }

  get scroll(): number {
    return this.#scroll;
  }

  /** The viewport is the binding's to know: it is the one thing here that comes from the DOM. */
  setViewport(viewport: number): void {
    this.#viewport = viewport;
  }

  get anchor(): Readonly<{ id: string; index: number; start: number }> {
    return this.#anchor;
  }

  /** Extent of one row: what was measured, or what the host says. */
  extentOf(index: number): number {
    const measured = this.#measured.get(this.#getId(index));
    return measured ?? this.#extents.of(index);
  }

  /**
   * Absolute position of a row, derived from the anchor rather than summed from the start.
   *
   * Rows between here and the anchor are the only ones whose extents matter (§5): everything before
   * the window is described by the anchor's position, not by adding up guesses about it.
   */
  positionOf(index: number): number {
    let position = this.#anchor.start;
    if (index >= this.#anchor.index) {
      for (let row = this.#anchor.index; row < index; row++) {
        position += this.extentOf(row);
      }
    } else {
      for (let row = index; row < this.#anchor.index; row++) {
        position -= this.extentOf(row);
      }
    }

    return position;
  }

  /** The reader moved. Nothing is corrected here — only the mounted range changes. */
  scrollTo(offset: number): void {
    this.#scroll = offset;
    this.#reanchor();
  }

  /**
   * A row turned out to be a different size than assumed.
   *
   * Rows at or after the anchor push the ones after them and leave the anchor alone. A row *before*
   * the anchor moves the rows between it and the anchor, which is correct and unavoidable: the
   * anchor is the thing being held still, and it is still being held.
   */
  measure(id: string, extent: number): void {
    if (this.#extents.exact) {
      return;
    }

    this.#measured.set(id, extent);
  }

  /** The model changed length. `prepended` rows arrived before the anchor and shift its index. */
  setCount(count: number, { prepended = 0 }: { prepended?: number } = {}): void {
    this.#count = count;
    if (prepended) {
      this.#anchor = { ...this.#anchor, index: this.#anchor.index + prepended };
    }
  }

  /**
   * Move to a row that may be nowhere near the window.
   *
   * The only operation that positions from estimates rather than from measurement, because there is
   * no measured path to somewhere the reader has never been. A jump is a discontinuity the reader
   * asked for, so being approximately right is what it can be.
   */
  jumpTo(index: number, align: 'start' | 'end' = 'start'): void {
    const clamped = Math.max(0, Math.min(index, this.#count - 1));
    let start = 0;
    for (let row = 0; row < clamped; row++) {
      start += this.extentOf(row);
    }

    this.#anchor = { id: this.#getId(clamped), index: clamped, start };
    this.#scroll = align === 'end' ? start + this.extentOf(clamped) - this.#viewport : start;
    this.#scroll = Math.max(0, this.#scroll);
    this.#reanchor();
  }

  /** The mounted range, the parent's offset, and the extent the thumb is computed from. */
  layout(): Window {
    if (!this.#count) {
      return { first: 0, last: -1, offset: 0, sizerExtent: 0 };
    }

    const { first, last } = this.#range();
    const offset = this.positionOf(first);
    let windowExtent = 0;
    for (let row = first; row <= last; row++) {
      windowExtent += this.extentOf(row);
    }

    let after = 0;
    for (let row = last + 1; row < this.#count; row++) {
      after += this.extentOf(row);
    }

    return { first, last, offset, sizerExtent: offset + windowExtent + after };
  }

  /**
   * What an edge revealed, if the window has reached one.
   *
   * The edges are where estimate meets ground truth: the first row starts at zero and the last one
   * ends at the content's end, by definition, so a computed position that says otherwise is the
   * measure of how wrong the estimates were. Reported rather than silently applied — absorbing it
   * into the anchor would move what the reader is looking at, and at an edge they are looking at
   * exactly the thing that would move.
   */
  drift(): EdgeDrift | undefined {
    if (!this.#count) {
      return undefined;
    }

    const { first, last } = this.#range();
    if (first === 0 && this.positionOf(0) !== 0) {
      return { edge: 'start', delta: this.positionOf(0) };
    }

    if (last === this.#count - 1) {
      const end = this.positionOf(last) + this.extentOf(last);
      const { sizerExtent } = this.layout();
      if (end !== sizerExtent) {
        return { edge: 'end', delta: sizerExtent - end };
      }
    }

    return undefined;
  }

  /** Visible rows, plus overscan, clamped to the model. */
  #range(): { first: number; last: number } {
    let first = this.#anchor.index;
    // Walk out from the anchor rather than searching from zero: the anchor is the only position
    // known exactly, so it is the only sound place to start.
    while (first > 0 && this.positionOf(first) > this.#scroll) {
      first--;
    }
    while (first < this.#count - 1 && this.positionOf(first) + this.extentOf(first) <= this.#scroll) {
      first++;
    }

    let last = first;
    let filled = this.positionOf(first) + this.extentOf(first);
    while (last < this.#count - 1 && filled < this.#scroll + this.#viewport) {
      last++;
      filled += this.extentOf(last);
    }

    return {
      first: Math.max(0, first - this.#overscan),
      last: Math.min(this.#count - 1, last + this.#overscan),
    };
  }

  /**
   * Keep the anchor inside the mounted range.
   *
   * An anchor outside the window is an anchor whose position is derived through rows nobody has
   * measured, which is the drift this design exists to avoid. Re-anchoring preserves the new
   * anchor's computed position exactly, so nothing moves when it happens.
   */
  #reanchor(): void {
    if (!this.#count) {
      return;
    }

    const { first, last } = this.#range();
    if (this.#anchor.index >= first && this.#anchor.index <= last) {
      return;
    }

    const index = Math.max(first, Math.min(this.#anchor.index, last));
    this.#anchor = { id: this.#getId(index), index, start: this.positionOf(index) };
  }
}
