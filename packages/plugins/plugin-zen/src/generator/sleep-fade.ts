//
// Copyright 2026 DXOS.org
//

/** Length of the fade to silence at the end of a timed Dream. */
export const SLEEP_FADE_SECONDS = 30;

/** What timed playback must do on a countdown tick. */
export type TimedPlaybackAction = { type: 'none' } | { type: 'fade'; seconds: number } | { type: 'stop' };

export type TimedPlaybackState = {
  /** Dream duration in seconds; 0 means untimed. */
  durationSeconds: number;
  /** Countdown seconds remaining. */
  remaining: number;
  playing: boolean;
  /** Whether the fade has already started. */
  fading: boolean;
};

/** Seconds the fade lasts for a Dream of the given duration: the last 30 s, or the whole Dream when shorter. */
export const sleepFadeSeconds = (durationSeconds: number): number =>
  durationSeconds > 0 ? Math.min(SLEEP_FADE_SECONDS, durationSeconds) : 0;

/** Decides whether a countdown tick starts the sleep fade, stops playback, or does nothing. */
export const timedPlaybackStep = ({
  durationSeconds,
  remaining,
  playing,
  fading,
}: TimedPlaybackState): TimedPlaybackAction => {
  if (!playing || durationSeconds <= 0) {
    return { type: 'none' };
  }
  if (remaining <= 0) {
    return { type: 'stop' };
  }
  if (!fading && remaining <= sleepFadeSeconds(durationSeconds)) {
    return { type: 'fade', seconds: remaining };
  }
  return { type: 'none' };
};
