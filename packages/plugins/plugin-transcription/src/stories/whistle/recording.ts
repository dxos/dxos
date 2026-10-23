//
// Copyright 2026 DXOS.org
//

import { WHISTLE_SAMPLE_RATE } from './protocol.ts';

/** Waveform resolution: one bar per 50 ms. */
export const BAR_SAMPLES = WHISTLE_SAMPLE_RATE / 20;

/** Bars the noise floor is estimated over: the last 30 s. */
const FLOOR_WINDOW_BARS = 600;

/** A bar this far above the noise floor is sound rather than silence. */
const SILENCE_MARGIN_DB = 15;

/** Never call a bar louder than this silent, however loud the room. */
const SILENCE_CEILING_DB = -35;

const toDb = (peak: number) => 20 * Math.log10(peak + 1e-10);

/** One waveform bar: the loudest sample in its window. */
export type WaveformBar = {
  peak: number;
};

/** The whole capture as 16 kHz mono samples, kept so it can be drawn and saved. */
export class Recording {
  readonly #chunks: Float32Array[] = [];
  readonly #bars: WaveformBar[] = [];
  readonly #listeners = new Set<() => void>();
  #length = 0;
  #peak = 0;
  #filled = 0;

  get bars(): readonly WaveformBar[] {
    return this.#bars;
  }

  /** Seconds captured. */
  get duration(): number {
    return this.#length / WHISTLE_SAMPLE_RATE;
  }

  /** Appends a chunk; the chunk is copied. */
  append(samples: Float32Array): void {
    this.#chunks.push(samples.slice());
    this.#length += samples.length;
    for (const sample of samples) {
      this.#peak = Math.max(this.#peak, Math.abs(sample));
      if (++this.#filled === BAR_SAMPLES) {
        this.#bars.push({ peak: this.#peak });
        this.#peak = 0;
        this.#filled = 0;
      }
    }
    this.#listeners.forEach((listener) => listener());
  }

  /**
   * The longest run of silence, in seconds, between `start` and `end` seconds. Silence is measured against the
   * noise floor (a low percentile of recent bars), since the browser's noise suppression leaves a varying hiss.
   */
  longestSilence(start: number, end: number): number {
    const recent = this.#bars.slice(-FLOOR_WINDOW_BARS).map(({ peak }) => toDb(peak));
    if (recent.length === 0) {
      return 0;
    }
    const floorDb = recent.toSorted((left, right) => left - right)[Math.floor(recent.length * 0.1)];
    const thresholdDb = Math.min(floorDb + SILENCE_MARGIN_DB, SILENCE_CEILING_DB);
    const barSeconds = BAR_SAMPLES / WHISTLE_SAMPLE_RATE;
    const from = Math.max(0, Math.floor(start / barSeconds));
    const to = Math.min(this.#bars.length, Math.ceil(end / barSeconds));
    let longest = 0;
    let run = 0;
    for (let index = from; index < to; index++) {
      run = toDb(this.#bars[index].peak) < thresholdDb ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    return longest * barSeconds;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }

  /** The capture, or the part between `start` and `end` seconds, as a 16-bit PCM WAV file. */
  toWav(start = 0, end = this.duration): Blob {
    const from = Math.max(0, Math.floor(start * WHISTLE_SAMPLE_RATE));
    const to = Math.min(this.#length, Math.ceil(end * WHISTLE_SAMPLE_RATE));
    const length = Math.max(0, to - from);
    const header = new DataView(new ArrayBuffer(44));
    const dataBytes = length * 2;
    const writeTag = (offset: number, tag: string) =>
      [...tag].forEach((char, index) => header.setUint8(offset + index, char.charCodeAt(0)));
    writeTag(0, 'RIFF');
    header.setUint32(4, 36 + dataBytes, true);
    writeTag(8, 'WAVE');
    writeTag(12, 'fmt ');
    header.setUint32(16, 16, true);
    header.setUint16(20, 1, true);
    header.setUint16(22, 1, true);
    header.setUint32(24, WHISTLE_SAMPLE_RATE, true);
    header.setUint32(28, WHISTLE_SAMPLE_RATE * 2, true);
    header.setUint16(32, 2, true);
    header.setUint16(34, 16, true);
    writeTag(36, 'data');
    header.setUint32(40, dataBytes, true);

    const data = new Int16Array(length);
    let position = 0;
    for (const chunk of this.#chunks) {
      const chunkEnd = position + chunk.length;
      for (let index = Math.max(from, position); index < Math.min(to, chunkEnd); index++) {
        data[index - from] = Math.max(-1, Math.min(1, chunk[index - position])) * 0x7fff;
      }
      position = chunkEnd;
    }
    return new Blob([header, data], { type: 'audio/wav' });
  }
}
