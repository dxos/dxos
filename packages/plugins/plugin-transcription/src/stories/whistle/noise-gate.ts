//
// Copyright 2026 DXOS.org
//

import { WHISTLE_SAMPLE_RATE } from './protocol.ts';

/** Analysis frame: 20 ms. */
const FRAME_SAMPLES = WHISTLE_SAMPLE_RATE / 50;

/** High-pass corner; below it is handling noise, hum and HVAC rumble rather than voice. */
const HIGH_PASS_HZ = 100;

export type NoiseGateOptions = {
  /** Speech must exceed the tracked noise floor by this much. */
  marginDb?: number;
  /** Absolute floor below which nothing counts as speech, whatever the noise floor. */
  minLevelDb?: number;
  /** Audio kept from before the gate opens, so word onsets are not clipped. */
  preRollMs?: number;
  /** Quiet kept open after speech, so trailing consonants and short pauses pass. */
  hangoverMs?: number;
  /** Speech must last this long to open the gate, so clicks and taps do not. */
  attackMs?: number;
};

export type NoiseGateOutput = {
  /** Audio to transcribe (empty while the gate is closed). */
  samples: Float32Array;
  /** True when the gate closed during this chunk: the utterance has ended. */
  closed: boolean;
  /** Whether the gate is open after this chunk. */
  open: boolean;
  /** Level of the latest frame, dBFS. */
  levelDb: number;
  /** Tracked noise floor, dBFS. */
  floorDb: number;
};

/**
 * Energy gate over 16 kHz mono audio. Whistle decodes silence and steady noise into phantom phrases
 * ("Thank you."), so only frames that stand out from the adaptive noise floor are passed on; a
 * fixed threshold would either clip quiet speakers or let a noisy room through.
 */
export class NoiseGate {
  readonly #marginDb: number;
  readonly #minLevelDb: number;
  readonly #preRollFrames: number;
  readonly #hangoverFrames: number;
  readonly #attackFrames: number;

  // One-pole high-pass state.
  readonly #alpha: number;
  #previousInput = 0;
  #previousOutput = 0;

  #frame = new Float32Array(FRAME_SAMPLES);
  #frameLength = 0;
  #preRoll: Float32Array[] = [];
  #floorDb = -60;
  #open = false;
  #quietFrames = 0;
  #speechFrames = 0;

  constructor({
    marginDb = 12,
    minLevelDb = -50,
    preRollMs = 300,
    hangoverMs = 400,
    attackMs = 60,
  }: NoiseGateOptions = {}) {
    this.#marginDb = marginDb;
    this.#minLevelDb = minLevelDb;
    this.#preRollFrames = Math.ceil(preRollMs / 20);
    this.#hangoverFrames = Math.ceil(hangoverMs / 20);
    this.#attackFrames = Math.ceil(attackMs / 20);
    const rc = 1 / (2 * Math.PI * HIGH_PASS_HZ);
    this.#alpha = rc / (rc + 1 / WHISTLE_SAMPLE_RATE);
  }

  process(input: Float32Array): NoiseGateOutput {
    const passed: Float32Array[] = [];
    let closed = false;
    let levelDb = -100;
    for (let index = 0; index < input.length; index++) {
      const output = this.#alpha * (this.#previousOutput + input[index] - this.#previousInput);
      this.#previousInput = input[index];
      this.#previousOutput = output;
      this.#frame[this.#frameLength++] = output;
      if (this.#frameLength === FRAME_SAMPLES) {
        const frame = this.#frame;
        this.#frame = new Float32Array(FRAME_SAMPLES);
        this.#frameLength = 0;
        levelDb = this.#levelDb(frame);
        closed = this.#gate(frame, levelDb, passed) || closed;
      }
    }

    const samples = new Float32Array(passed.reduce((total, frame) => total + frame.length, 0));
    let offset = 0;
    for (const frame of passed) {
      samples.set(frame, offset);
      offset += frame.length;
    }
    return { samples, closed, open: this.#open, levelDb, floorDb: this.#floorDb };
  }

  #levelDb(frame: Float32Array): number {
    let sum = 0;
    for (const sample of frame) {
      sum += sample * sample;
    }
    return 10 * Math.log10(sum / frame.length + 1e-10);
  }

  /** Returns true when this frame closes the gate. */
  #gate(frame: Float32Array, levelDb: number, passed: Float32Array[]): boolean {
    const speech = levelDb > Math.max(this.#floorDb + this.#marginDb, this.#minLevelDb);

    // Minimum tracking: the floor falls within a few frames and rises over seconds, so the pauses
    // between words pin it down while a steady noise, even one first taken for speech, is learned.
    this.#floorDb += (levelDb - this.#floorDb) * (levelDb < this.#floorDb ? 0.3 : 0.005);

    if (speech && this.#open) {
      this.#quietFrames = 0;
      passed.push(frame);
      return false;
    }
    if (speech && ++this.#speechFrames >= this.#attackFrames) {
      // The earlier attack frames sit in the pre-roll, so it is flushed with this one.
      this.#open = true;
      this.#quietFrames = 0;
      this.#speechFrames = 0;
      passed.push(...this.#preRoll, frame);
      this.#preRoll = [];
      return false;
    }
    if (!speech) {
      this.#speechFrames = 0;
    }

    if (this.#open) {
      passed.push(frame);
      if (++this.#quietFrames >= this.#hangoverFrames) {
        this.#open = false;
        return true;
      }
      return false;
    }

    this.#preRoll.push(frame);
    if (this.#preRoll.length > this.#preRollFrames) {
      this.#preRoll.shift();
    }
    return false;
  }
}
