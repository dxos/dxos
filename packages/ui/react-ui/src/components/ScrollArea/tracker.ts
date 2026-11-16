//
// Copyright 2026 DXOS.org
//

import { type ScrollPosition, applyScrollPosition, captureScrollPosition } from './position.ts';

/** The name an unnamed area is tracked under when it is the outermost one. */
export const MAIN_AREA = 'main';

export type ScrollTrackerOptions = {
  /** The position to restore in an area as it starts being tracked. */
  initial?: (name: string) => ScrollPosition | undefined;
  /** Called as the reader scrolls a tracked area, at most once an `interval`. */
  onScroll?: (name: string, position: ScrollPosition) => void;
  /** Milliseconds between reports while an area scrolls. */
  interval?: number;
  /** Milliseconds a restore keeps re-applying as the area's content resizes, unless the reader takes over. */
  restoreWindow?: number;
};

const DEFAULT_INTERVAL = 100;
const DEFAULT_RESTORE_WINDOW = 5_000;

/** Input on an area that means the reader is moving it, which ends a restore. */
const INPUT_EVENTS = ['wheel', 'pointerdown', 'keydown', 'touchstart'] as const;

type Tracked = {
  name: string;
  restore: (position: ScrollPosition) => void;
  dispose: () => void;
};

const track = (viewport: HTMLElement, name: string, getOptions: () => ScrollTrackerOptions): Tracked => {
  let restoring: { position: ScrollPosition; timer: ReturnType<typeof setTimeout> } | undefined;
  let pending: ReturnType<typeof setTimeout> | undefined;
  // The frame holds the area's thumbs, so dragging one counts as the reader's input.
  const frame =
    viewport.closest<HTMLElement>('[data-scope="scroll-area"][data-part="root"]') ?? viewport.parentElement ?? viewport;

  const reapply = () => restoring && applyScrollPosition(viewport, restoring.position);
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(reapply);

  const stopRestoring = () => {
    if (restoring) {
      clearTimeout(restoring.timer);
      restoring = undefined;
      observer?.disconnect();
    }
  };

  // Scrolling a restore causes is not the reader's, so it is not reported.
  const onScroll = () => {
    if (restoring || pending) {
      return;
    }
    pending = setTimeout(() => {
      pending = undefined;
      if (!restoring) {
        getOptions().onScroll?.(name, captureScrollPosition(viewport));
      }
    }, getOptions().interval ?? DEFAULT_INTERVAL);
  };

  const restore = (position: ScrollPosition) => {
    stopRestoring();
    restoring = { position, timer: setTimeout(stopRestoring, getOptions().restoreWindow ?? DEFAULT_RESTORE_WINDOW) };
    applyScrollPosition(viewport, position);
    observer?.observe(viewport);
    for (const child of viewport.children) {
      observer?.observe(child);
    }
  };

  viewport.addEventListener('scroll', onScroll, { passive: true });
  for (const type of INPUT_EVENTS) {
    frame.addEventListener(type, stopRestoring, { passive: true, capture: true });
  }

  const initial = getOptions().initial?.(name);
  if (initial) {
    restore(initial);
  }

  return {
    name,
    restore,
    dispose: () => {
      stopRestoring();
      clearTimeout(pending);
      viewport.removeEventListener('scroll', onScroll);
      for (const type of INPUT_EVENTS) {
        frame.removeEventListener(type, stopRestoring, { capture: true });
      }
    },
  };
};

/**
 * Keeps the scroll position of the scrolling areas inside one element: the outermost unnamed area as {@link MAIN_AREA},
 * and each named one under its name. Areas outside the element (in a portal) are not tracked.
 */
export class ScrollTracker {
  readonly #getOptions: () => ScrollTrackerOptions;
  readonly #areas = new Map<HTMLElement, { name?: string; tracked?: Tracked }>();
  #root: HTMLElement | null = null;

  constructor(getOptions: () => ScrollTrackerOptions) {
    this.#getOptions = getOptions;
  }

  setRoot(root: HTMLElement | null): void {
    this.#root = root;
  }

  /** Starts tracking `viewport`, under `name` or, unnamed, as the main area when it is the outermost one. */
  register(viewport: HTMLElement, name?: string): () => void {
    if (!this.#root?.contains(viewport)) {
      return () => {};
    }
    this.#areas.set(viewport, { name });
    this.#update();
    return () => {
      this.#areas.get(viewport)?.tracked?.dispose();
      this.#areas.delete(viewport);
      this.#update();
    };
  }

  /** Restores `position` in the area tracked under `name`. */
  restore(name: string, position: ScrollPosition): void {
    for (const { tracked } of this.#areas.values()) {
      if (tracked?.name === name) {
        tracked.restore(position);
      }
    }
  }

  dispose(): void {
    for (const area of this.#areas.values()) {
      area.tracked?.dispose();
    }
    this.#areas.clear();
  }

  // Of several outermost unnamed areas (side by side), the largest is the main one.
  #update(): void {
    const unnamed = [...this.#areas.entries()]
      .filter(([, { name }]) => name === undefined)
      .map(([viewport]) => viewport);
    const outermost = unnamed.filter(
      (viewport) => !unnamed.some((other) => other !== viewport && other.contains(viewport)),
    );
    const main = outermost.reduce<HTMLElement | undefined>(
      (largest, viewport) =>
        !largest || viewport.clientWidth * viewport.clientHeight > largest.clientWidth * largest.clientHeight
          ? viewport
          : largest,
      undefined,
    );
    for (const [viewport, area] of this.#areas) {
      const name = area.name ?? (viewport === main ? MAIN_AREA : undefined);
      if (area.tracked?.name !== name) {
        area.tracked?.dispose();
        area.tracked = name === undefined ? undefined : track(viewport, name, this.#getOptions);
      }
    }
  }
}
