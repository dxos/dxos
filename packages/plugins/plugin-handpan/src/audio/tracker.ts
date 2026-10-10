//
// Copyright 2026 DXOS.org
//

export type PitchTrackerOptions = {
  /** Consecutive frames a new note must persist before the tracker switches to it. */
  attackFrames?: number;
  /** Consecutive empty frames (silence or no clear pitch) before the held note is released. */
  releaseFrames?: number;
  /** Smoothing factor (0–1) for the cents reading of the held note; lower is steadier. */
  smoothing?: number;
};

export type TrackedPitch<T> = {
  key: T;
  cents: number;
};

/**
 * Debounces per-frame note estimates into a stable reading. A single frame with an octave error,
 * a ringing neighbour or noise would otherwise flip the display ~90 times a second.
 */
export class PitchTracker<T> {
  readonly #attackFrames: number;
  readonly #releaseFrames: number;
  readonly #smoothing: number;
  #current: TrackedPitch<T> | undefined;
  #candidate: T | undefined;
  #candidateFrames = 0;
  #emptyFrames = 0;

  constructor({ attackFrames = 4, releaseFrames = 12, smoothing = 0.25 }: PitchTrackerOptions = {}) {
    this.#attackFrames = attackFrames;
    this.#releaseFrames = releaseFrames;
    this.#smoothing = smoothing;
  }

  get current(): TrackedPitch<T> | undefined {
    return this.#current;
  }

  /** Feeds one frame's estimate (`undefined` for silence or no clear pitch); returns the stable reading. */
  update(estimate: TrackedPitch<T> | undefined): TrackedPitch<T> | undefined {
    if (!estimate) {
      this.#candidate = undefined;
      this.#candidateFrames = 0;
      if (++this.#emptyFrames >= this.#releaseFrames) {
        this.#current = undefined;
      }
      return this.#current;
    }

    this.#emptyFrames = 0;
    if (this.#current && estimate.key === this.#current.key) {
      this.#candidate = undefined;
      this.#candidateFrames = 0;
      this.#current = {
        key: estimate.key,
        cents: this.#current.cents + this.#smoothing * (estimate.cents - this.#current.cents),
      };
      return this.#current;
    }

    this.#candidateFrames = estimate.key === this.#candidate ? this.#candidateFrames + 1 : 1;
    this.#candidate = estimate.key;
    if (this.#candidateFrames >= this.#attackFrames) {
      this.#current = estimate;
      this.#candidate = undefined;
      this.#candidateFrames = 0;
    }
    return this.#current;
  }

  /** Adopts a note immediately — a resolved strike is authoritative, unlike a single frame. */
  set(pitch: TrackedPitch<T>): void {
    this.#current = pitch;
    this.#candidate = undefined;
    this.#candidateFrames = 0;
    this.#emptyFrames = 0;
  }

  reset(): void {
    this.#current = undefined;
    this.#candidate = undefined;
    this.#candidateFrames = 0;
    this.#emptyFrames = 0;
  }
}
