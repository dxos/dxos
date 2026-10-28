//
// Copyright 2026 DXOS.org
//

//
// The clock (react-ui-canvas ANIMATION.md §5.1): the time shown, and whether it plays. One rAF loop owned by the clock
// (`useClock`, @dxos/react-ui-animation) advances it while playing; export and tests set `time` directly and never
// start the loop. Nothing else reads animation-frame timestamps or `performance.now()` to animate, so every animated
// thing agrees.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

export type Clock = {
  /** Seconds into the timeline. */
  time: Atom.Writable<number>;
  playing: Atom.Writable<boolean>;
  /** Playback speed; 1 is real time. */
  rate: Atom.Writable<number>;
};

export const createClock = (): Clock => ({
  time: Atom.keepAlive(Atom.make(0)),
  playing: Atom.keepAlive(Atom.make(false)),
  rate: Atom.keepAlive(Atom.make(1)),
});

/** The longest step the loop takes in one frame, in seconds, however long the frame was in coming (a hidden tab). */
export const MAX_CLOCK_STEP = 0.1;

/**
 * What a page offers a frame renderer (react-ui-canvas `scripts/render-story.mjs`): it seeks the clock, then waits
 * until every element marked `data-frame-time` shows that time, rather than faking the browser's clock.
 */
export type ExposedClock = {
  /** Seconds of the timeline to render. */
  duration: () => number;
  fps: () => number;
  /** Pauses playback and shows time `t`. */
  seek: (t: number) => void;
};

/** The global a frame renderer reads the exposed clock from. */
export const EXPOSED_CLOCK_KEY = '__DX_SCENE_CLOCK__';

/** The attribute every drawn layer carries with the time it last drew; export waits until all of them match. */
export const FRAME_TIME_ATTRIBUTE = 'data-frame-time';

/** Formats a time for `data-frame-time`, so a seek and the layers that drew it compare as strings. */
export const frameTimeAttribute = (t: number): string => t.toFixed(4);

/** Publishes the clock on `globalThis` for a frame renderer; returns the function that withdraws it. */
export const exposeClock = (
  registry: Registry.AtomRegistry,
  clock: Clock,
  timeline: () => { duration: number; fps: number },
): (() => void) => {
  const exposed: ExposedClock = {
    duration: () => timeline().duration,
    fps: () => timeline().fps,
    seek: (t) => {
      registry.set(clock.playing, false);
      registry.set(clock.time, t);
    },
  };
  Reflect.set(globalThis, EXPOSED_CLOCK_KEY, exposed);
  return () => {
    if (Reflect.get(globalThis, EXPOSED_CLOCK_KEY) === exposed) {
      Reflect.deleteProperty(globalThis, EXPOSED_CLOCK_KEY);
    }
  };
};
