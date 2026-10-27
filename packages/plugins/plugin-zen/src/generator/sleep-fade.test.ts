//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SLEEP_FADE_SECONDS, sleepFadeSeconds, timedPlaybackStep } from './sleep-fade.ts';

/** Replays a countdown from `durationSeconds` to zero and records each action timed playback takes. */
const runCountdown = (durationSeconds: number) => {
  const actions: { remaining: number; type: string; seconds?: number }[] = [];
  let fading = false;
  for (let remaining = durationSeconds; remaining >= 0; remaining--) {
    const action = timedPlaybackStep({ durationSeconds, remaining, playing: true, fading });
    if (action.type === 'fade') {
      fading = true;
      actions.push({ remaining, type: action.type, seconds: action.seconds });
    } else if (action.type === 'stop') {
      actions.push({ remaining, type: action.type });
    }
  }
  return actions;
};

describe('sleep fade', () => {
  test('F-6.1: a long Dream fades over its last 30 s, then stops at zero', ({ expect }) => {
    expect(SLEEP_FADE_SECONDS).toBe(30);
    expect(runCountdown(60)).toEqual([
      { remaining: 30, type: 'fade', seconds: 30 },
      { remaining: 0, type: 'stop' },
    ]);
  });

  test('F-6.1: a Dream shorter than 30 s fades over its whole length', ({ expect }) => {
    expect(sleepFadeSeconds(15)).toBe(15);
    expect(runCountdown(15)).toEqual([
      { remaining: 15, type: 'fade', seconds: 15 },
      { remaining: 0, type: 'stop' },
    ]);
  });

  test('F-6.1: a Dream of exactly 30 s fades from the start', ({ expect }) => {
    expect(runCountdown(30)).toEqual([
      { remaining: 30, type: 'fade', seconds: 30 },
      { remaining: 0, type: 'stop' },
    ]);
  });

  test('F-6.2: once stopped by hand, timed playback neither fades nor stops again', ({ expect }) => {
    for (const fading of [false, true]) {
      for (const remaining of [45, 20, 0]) {
        expect(timedPlaybackStep({ durationSeconds: 60, remaining, playing: false, fading })).toEqual({
          type: 'none',
        });
      }
    }
  });

  test('F-6.3: an untimed Dream never fades or auto-stops', ({ expect }) => {
    expect(sleepFadeSeconds(0)).toBe(0);
    for (const remaining of [0, 10, 30]) {
      expect(timedPlaybackStep({ durationSeconds: 0, remaining, playing: true, fading: false })).toEqual({
        type: 'none',
      });
    }
  });
});
