//
// Copyright 2026 DXOS.org
//

//
// Shot sequencing (F-2.2): shots play one after another, each for its duration, so a time in the animation is a
// shot and a time in it. A shot's transition shapes how it enters from the one before.
//

import { type Animation } from '#types';

/** Where a shot sits on the animation's clock. */
export type ShotSpan = {
  shot: Animation.Shot;
  index: number;
  /** Seconds into the animation. */
  start: number;
  end: number;
};

/** A time in the animation as a shot and a time in it. */
export type ShotTime = ShotSpan & {
  /** Seconds into the shot. */
  local: number;
  /** How much of the shot shows, 0 to 1: below 1 while a fade or dissolve brings it in. */
  opacity: number;
};

/** Every shot's span, in order; a shot with no length takes none. */
export const shotSpans = (shots: readonly Animation.Shot[]): ShotSpan[] => {
  let start = 0;
  return shots.map((shot, index) => {
    const duration = Math.max(0, shot.duration);
    const span = { shot, index, start, end: start + duration };
    start += duration;
    return span;
  });
};

/** The animation's length in seconds: its shots end to end. */
export const animationDuration = (shots: readonly Animation.Shot[]): number =>
  shots.reduce((total, shot) => total + Math.max(0, shot.duration), 0);

/**
 * The shot playing at `t` seconds into the animation, and the time in it; undefined with no shots. A time on a
 * boundary is the start of the later shot, and a time at or past the end is the end of the last.
 */
export const locateShot = (shots: readonly Animation.Shot[], t: number): ShotTime | undefined => {
  const spans = shotSpans(shots).filter((span) => span.end > span.start);
  if (spans.length === 0) {
    return undefined;
  }
  const clamped = Math.max(0, t);
  const span = spans.find((span) => clamped < span.end) ?? spans[spans.length - 1];
  const local = Math.min(span.end - span.start, clamped - span.start);
  return { ...span, local, opacity: transitionOpacity(span, local) };
};

/**
 * The opacity of a shot `local` seconds in: a fade or dissolve rises from 0 over its duration; a cut shows at once.
 * A dissolve plays as a fade until stages can draw two shots at once.
 */
const transitionOpacity = ({ shot }: ShotSpan, local: number): number => {
  const transition = shot.transition;
  if (!transition || transition.kind === 'cut' || transition.duration <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, local / transition.duration));
};
