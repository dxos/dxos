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
  /**
   * Extent along the scroll axis of the row at `index`, when nothing has been measured for it.
   */
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
  /**
   * Empty extent after the last row, so the reader can scroll it up to the start of the viewport.
   *
   * A number the host supplies, not a mode the list has. On the old design this was a flag that
   * special-cased the tail everywhere it was consulted, and it could not be made stable; here it is
   * added to the sizer and nothing else knows about it (§7).
   */
  reserve?: number;
};

/** The mounted range and where its parent goes. */
export type Layout = {
  /** First and last mounted row, inclusive — the visible rows plus overscan. */
  first: number;
  last: number;
  /**
   * First and last row the reader can actually see.
   *
   * Reported separately because it is what a readout means by "where am I": the mounted range
   * includes rows deliberately kept off screen, and naming one of those would be describing the
   * overscan rather than the reader.
   */
  visible: { first: number; last: number };
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

/**
 *
 */
export class Placement {
  #count: number;
  #getId: (index: number) => string;
  #extents: Extents;
  #viewport: number;
  #overscan: number;
  #reserve: number;

  /** Measured extents by message id, so that reordering the model cannot invalidate them. */
  readonly #measured = new Map<string, number>();

  /** The one authoritative position: this row starts exactly here. */
  #anchor: { id: string; index: number; start: number };

  #scroll = 0;

  constructor({ count, getId, extents, viewport, overscan = DEFAULT_OVERSCAN, reserve = 0 }: PlacementOptions) {
    this.#count = count;
    this.#getId = getId;
    this.#extents = extents;
    this.#viewport = viewport;
    this.#overscan = overscan;
    this.#reserve = reserve;
    this.#anchor = { id: count ? getId(0) : '', index: 0, start: 0 };
  }

  get scroll(): number {
    return this.#scroll;
  }

  get count(): number {
    return this.#count;
  }

  /** The viewport is the binding's to know: it is the one thing here that comes from the DOM. */
  setViewport(viewport: number): void {
    this.#viewport = viewport;
  }

  /**
   * The host's answer about extents can change — a row is edited, a panel opens, a story flips a
   * fixture — and it is a *function*, so keeping the one handed over at construction quietly pins
   * the layout to whatever was true then. Measured extents survive: they are keyed by id and this
   * only replaces what the host would say about a row nobody has measured.
   */
  setExtents(extents: Extents): void {
    this.#extents = extents;
  }

  setReserve(reserve: number): void {
    this.#reserve = reserve;
  }

  /**
   * The host's identity function, which is a closure over the host's own list.
   *
   * Appending a message gives a *new* `getId`, and a placement holding the one it was constructed
   * with resolves the new row's index to an id nobody will ever measure. The binding then stores
   * that row's measurement under the id the DOM carries and reads it back under the stale one, so
   * the row is measured, found to disagree, measured again — every commit, for ever. It presents as
   * a render loop rather than as a wrong size, which is what made `bridge/Tail` look like a tail
   * defect (§8: measurement is only a correction if it can be read back).
   */
  setGetId(getId: (index: number) => string): void {
    this.#getId = getId;
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
    // The last row's end *is* the content's end, whatever the estimates in between say — plus the
    // reserve, which is part of the resting view: the tail sits that much clear of the viewport's
    // edge. Summing instead lands wherever the guesses add up to, which for a chat's "go to the
    // bottom" is a tail that is nearly at the bottom — the one place approximately right is wrong.
    const end = clamped === this.#count - 1 ? this.layout().sizerExtent : start + this.extentOf(clamped);
    this.#scroll = align === 'end' ? end - this.#viewport : start;
    this.#scroll = Math.max(0, this.#scroll);
    this.#reanchor();
  }

  /**
   * Where the reader has to be for `index` to sit at the start (or end) of the viewport.
   *
   * Reports; does not move. `jumpTo` re-anchors as well, which is right for a discontinuity and
   * wrong for a glide: the anchor would arrive at the destination while the element was still
   * travelling, so the reader would watch the rows they were scrolling *through* unmount and the
   * journey happen over nothing.
   */
  offsetOf(index: number, align: 'start' | 'end' = 'start'): number {
    const clamped = Math.max(0, Math.min(index, this.#count - 1));
    const start = this.positionOf(clamped);
    // The reserve trails the last row and is part of its resting view.
    const reserve = clamped === this.#count - 1 ? this.#reserve : 0;
    return Math.max(0, align === 'end' ? start + this.extentOf(clamped) + reserve - this.#viewport : start);
  }

  /**
   * Where the reader has to be for the last row to rest against the end of the viewport.
   *
   * Derived from the anchor, like every other position, and deliberately **not** from a sum over the
   * model: a follow asks this again on every commit, and each answer mounts rows whose measurement
   * replaces the estimates that sum is over — so a sum-based end moves every time it is consulted,
   * and consulting it is what moves it. That is not slow convergence, it is a feedback loop, and in
   * React it terminates by exceeding the update limit rather than by settling (`bridge/Tail`).
   *
   * Anchor-relative, the answer only changes as the rows *between the anchor and the last row* are
   * measured — each of them once — so a follow settles in a couple of commits and rows the reader
   * has already passed cannot disturb it.
   */
  endOffset(): number {
    if (!this.#count) {
      return 0;
    }

    const last = this.#count - 1;
    return Math.max(0, this.positionOf(last) + this.extentOf(last) - this.#viewport);
  }

  /** The mounted range, the parent's offset, and the extent the thumb is computed from. */
  layout(): Layout {
    if (!this.#count) {
      return { first: 0, last: -1, visible: { first: 0, last: -1 }, offset: 0, sizerExtent: 0 };
    }

    const { first, last, visible } = this.#range();
    const offset = this.positionOf(first);
    let windowExtent = 0;
    for (let row = first; row <= last; row++) {
      windowExtent += this.extentOf(row);
    }

    let after = 0;
    for (let row = last + 1; row < this.#count; row++) {
      after += this.extentOf(row);
    }

    return { first, last, visible, offset, sizerExtent: offset + windowExtent + after + this.#reserve };
  }

  /**
   * Repay the start edge's drift: shift every position so row 0 starts at exactly zero, and move
   * the scroll by the same amount so nothing the reader sees moves.
   *
   * The first row starting at zero is the one absolute fact of content space, and estimates being
   * replaced above the anchor break it: a feed opened at its tail whose rows measure taller than
   * assumed pushes row 0 *negative*, where no scroll can reach it — the reader arrives at the top
   * and the first messages simply are not there. This is the single correction that must touch the
   * scroll (§7's rule is about corrections and readers sharing a channel; here both the content and
   * the offset move by the same delta in the same commit, so the reader sees nothing at all).
   * Returns the shift for the binding to apply to the element.
   */
  rebaseStart(): number {
    if (!this.#count) {
      return 0;
    }

    const shift = -this.positionOf(0);
    if (shift === 0) {
      return 0;
    }

    this.#anchor = { ...this.#anchor, start: this.#anchor.start + shift };
    this.#scroll = Math.max(0, this.#scroll + shift);
    return shift;
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
      // Against the content's end, not the document's: reserved space is somewhere the reader may go
      // and nowhere any row is, so counting it would report a drift the size of the reserve for ever.
      const { sizerExtent } = this.layout();
      const content = sizerExtent - this.#reserve;
      if (end !== content) {
        return { edge: 'end', delta: content - end };
      }
    }

    return undefined;
  }

  /** Visible rows, plus overscan, clamped to the model. */
  #range(): { first: number; last: number; visible: { first: number; last: number } } {
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
      visible: { first, last },
    };
  }

  /**
   * The anchor is the first row the reader can see — always, not merely when the old one leaves
   * the window.
   *
   * The anchor is the row held still while others are measured, so it must be the reader's
   * reference point. Clamping the old anchor into the mounted range let it drift to the window's
   * *far* edge after an upward scroll — below everything on screen — and a widget toggled open
   * above it then pushed the whole viewport up by its own growth: the engine held a row the reader
   * could not see still, at the expense of every row they could. Re-anchoring preserves the new
   * anchor's computed position exactly, so the move itself shifts nothing.
   */
  #reanchor(): void {
    if (!this.#count) {
      return;
    }

    const { visible } = this.#range();
    if (this.#anchor.index === visible.first) {
      return;
    }

    const index = visible.first;
    this.#anchor = { id: this.#getId(index), index, start: this.positionOf(index) };
  }
}
