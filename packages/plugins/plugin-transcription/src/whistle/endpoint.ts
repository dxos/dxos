//
// Copyright 2026 DXOS.org
//

import { BAR_SAMPLES, BAR_SECONDS, FLOOR_WINDOW_BARS, silenceThresholdDb, toDb } from './recording.ts';

/** Why a stream should end: a request followed by a pause, or a stream that has heard nothing. */
export type Endpoint = 'request' | 'idle';

/** A stream that has heard nothing is ended after this long, so silence does not pile up in front of a request. */
const IDLE_SECONDS = 1;

/** An idle stream is ended only this far into a silence, so a request that is just starting is not split. */
const IDLE_GAP_SECONDS = 0.5;

/** Sound shorter than this (a click, a tap) is not a request. */
const MIN_SOUND_SECONDS = 0.15;

/**
 * A bar quieter than this is never sound, however far above the noise floor: room tone in a quiet room sits
 * well above its own floor, and Whistle hears words in it ("Thank you."). Speech after the browser's gain
 * control peaks around -20 dBFS; the silence fixture's room tone peaks at -37.
 */
const MIN_SOUND_DB = -35;

/**
 * Tracks silence in a stream's audio as it arrives: where a spoken request ends (a pause after sound, when a
 * pause is set), and how much silence the stream ends in. Every pass re-decodes the whole stream, so it also
 * ends streams that have heard nothing, keeping each request's stream short.
 */
export class Endpointer {
  readonly #recentDb: number[] = [];
  #peak = 0;
  #filled = 0;
  /** Bars since the stream began, of sound in it, and of silence at its end. */
  #bars = 0;
  #soundBars = 0;
  #silentBars = 0;

  readonly #pauseSeconds: number | undefined;

  /** `pauseSeconds`: end a request at a pause this long; without it, requests end only when stopped. */
  constructor(pauseSeconds?: number) {
    this.#pauseSeconds = pauseSeconds;
  }

  /** The stream has heard sound long enough to be speech. */
  get heard(): boolean {
    return this.#soundBars * BAR_SECONDS >= MIN_SOUND_SECONDS;
  }

  /** Seconds of silence the audio so far ends in. */
  get silentSeconds(): number {
    return this.#silentBars * BAR_SECONDS;
  }

  /** Feeds a chunk; returns whether the stream should end after it, and why. */
  push(samples: Float32Array): Endpoint | undefined {
    let endpoint: Endpoint | undefined;
    for (const sample of samples) {
      this.#peak = Math.max(this.#peak, Math.abs(sample));
      if (++this.#filled === BAR_SAMPLES) {
        endpoint ??= this.#bar(toDb(this.#peak));
        this.#peak = 0;
        this.#filled = 0;
      }
    }
    return endpoint;
  }

  /** Starts a new stream (the caller ended the last one). */
  reset(): void {
    this.#bars = 0;
    this.#soundBars = 0;
    this.#silentBars = 0;
  }

  #bar(levelDb: number): Endpoint | undefined {
    this.#recentDb.push(levelDb);
    if (this.#recentDb.length > FLOOR_WINDOW_BARS) {
      this.#recentDb.shift();
    }
    const thresholdDb = silenceThresholdDb(this.#recentDb) ?? 0;
    this.#bars++;
    if (levelDb < thresholdDb || levelDb < MIN_SOUND_DB) {
      this.#silentBars++;
    } else {
      this.#soundBars++;
      this.#silentBars = 0;
    }

    const heard = this.heard;
    const endpoint: Endpoint | undefined =
      heard && this.#pauseSeconds !== undefined && this.#silentBars * BAR_SECONDS >= this.#pauseSeconds
        ? 'request'
        : !heard && this.#bars * BAR_SECONDS >= IDLE_SECONDS && this.#silentBars * BAR_SECONDS >= IDLE_GAP_SECONDS
          ? 'idle'
          : undefined;
    if (endpoint) {
      this.reset();
    }
    return endpoint;
  }
}
