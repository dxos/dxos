//
// Copyright 2026 DXOS.org
//

/** Messages read from the feed's tail on open. */
export const INITIAL_WINDOW = 200;

/** Messages added each time the reader reaches the oldest loaded turn. */
export const WINDOW_STEP = 200;

export type FeedWindowState = {
  /** Messages the current read asks for. */
  size: number;
  /**
   * Whether the reader may pull in another page. Cleared by a grow and re-armed only once the
   * reader has left the oldest loaded turn, so one scroll-to-top gesture costs one page — a grow
   * that left the reader still on the first row cannot chain into reading the whole feed.
   */
  armed: boolean;
};

export const initialWindow = (size: number = INITIAL_WINDOW): FeedWindowState => ({ size, armed: true });

export type FeedWindowEvent = {
  /** Index of the first mounted row, or `undefined` before the viewport has measured. */
  startIndex?: number;
  /** Messages the last read returned. */
  loaded: number;
};

/**
 * Whether reaching the oldest loaded turn should pull in another page, and the window that follows.
 *
 * A read that came back short of its limit is the feed's start, so there is nothing older to ask
 * for: growing past it would re-read the same set on every scroll.
 */
export const advanceWindow = (state: FeedWindowState, { startIndex, loaded }: FeedWindowEvent): FeedWindowState => {
  if (startIndex !== undefined && startIndex > 0) {
    return state.armed ? state : { ...state, armed: true };
  }

  if (startIndex !== 0 || !state.armed) {
    return state;
  }

  // A short read is the feed's start, and disarming there costs the reader nothing while keeping
  // later arrivals from lifting `loaded` to the limit and growing the window without a new gesture.
  if (loaded < state.size) {
    return { ...state, armed: false };
  }

  return { size: state.size + WINDOW_STEP, armed: false };
};
