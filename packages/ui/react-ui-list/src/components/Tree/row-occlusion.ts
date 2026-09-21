//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect, useState } from 'react';

/**
 * How far past the viewport a row still counts as visible. A screenful in each direction, so a
 * scroll always has rendered rows ahead of it and never catches the fill.
 */
const VIEWPORT_MARGIN = '100% 0px';

/** Rows that must have been measured before their median stands in for a row nobody has seen. */
const ESTIMATE_SAMPLE = 5;

/**
 * Rows rendered before the observer has said anything.
 *
 * An observer reports after the first paint, so a list that waited for one would paint empty and
 * fill a frame later — a flash of blank rows exactly where the reader is looking. Enough to cover a
 * tall viewport, and the observer takes them back if they turn out to be scrolled away.
 */
const EAGER_ROWS = 30;

/**
 * Heights of the rows that have been rendered, shared by every row of one tree.
 *
 * An unrendered row still has to hold the space its content would occupy, and only the content
 * knows how much that is — a task row is one line tall or four, depending on its description. So a
 * row records itself while it is up, and a row nobody has scrolled to borrows the median of those.
 * Until enough have been measured there is no estimate and a row takes its natural height, which
 * makes the scrollbar short rather than making a row the wrong size.
 */
export class RowHeights {
  #byValue = new Map<string, number>();
  #estimate: number | undefined;
  readonly #onEstimate: (estimate: number) => void;

  /**
   * @param onEstimate Called when the median moves, so the rows that are holding it can be asked
   * for again. A row that was already empty on the first paint rendered before anything had been
   * measured, and nothing else would tell it that a size is now known.
   */
  constructor(onEstimate: (estimate: number) => void) {
    this.#onEstimate = onEstimate;
  }

  record(value: string, height: number): void {
    if (height <= 0 || this.#byValue.get(value) === height) {
      return;
    }

    this.#byValue.set(value, height);
    if (this.#byValue.size < ESTIMATE_SAMPLE) {
      return;
    }

    const sorted = [...this.#byValue.values()].sort((left, right) => left - right);
    const median = sorted[Math.floor(sorted.length / 2)];
    // A pixel of drift is not worth a render of every row that is holding a space.
    if (this.#estimate === undefined || Math.abs(median - this.#estimate) > 1) {
      this.#estimate = median;
      this.#onEstimate(median);
    }
  }

  /** The row's own measured height, or the median of the measured ones. */
  reserve(value: string): number | undefined {
    return this.#byValue.get(value) ?? this.#estimate;
  }
}

export type RowOcclusion = {
  /** Whether the row should render its heading and columns. */
  rendered: boolean;
  /** Height to hold while it does not, in pixels; undefined before anything has been measured. */
  reservedHeight: number | undefined;
};

/**
 * Renders a row's contents only while the row is on screen.
 *
 * A list of two hundred rows must not build two hundred rows' worth of controls to show twenty, and
 * the cost is not the row element — it is everything a consumer hangs inside it. Rows start empty
 * and fill in as they come into view, which is why a row is observed rather than measured against a
 * scroll offset: the row reports its own position, so nothing has to know where the scroll
 * container is or how tall a row is supposed to be.
 */
export const useRowOcclusion = (
  ref: RefObject<HTMLElement | null>,
  value: string,
  index: number,
  enabled: boolean,
  heights: RowHeights,
): RowOcclusion => {
  const [onScreen, setOnScreen] = useState(index < EAGER_ROWS);

  useEffect(() => {
    const element = ref.current;
    // No observer (a test DOM, an old browser) means every row renders, which is the behaviour
    // without this hook rather than a broken list.
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: VIEWPORT_MARGIN,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);

  const rendered = !enabled || onScreen;

  // Re-measured on every render of a rendered row rather than watched: the height that matters is
  // the one the row has while it is up, and a row's content changes under it (a title edit, a
  // status change) without the row itself resizing observably.
  useEffect(() => {
    if (enabled && rendered && ref.current) {
      heights.record(value, ref.current.offsetHeight);
    }
  });

  return { rendered, reservedHeight: rendered ? undefined : heights.reserve(value) };
};
