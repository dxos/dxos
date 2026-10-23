//
// Copyright 2026 DXOS.org
//

import { WHISTLE_SAMPLE_RATE } from './protocol.ts';

/** Waveform resolution: one bar per 50 ms. */
export const BAR_SAMPLES = WHISTLE_SAMPLE_RATE / 20;

/** One waveform bar: the loudest sample in its window and whether the noise gate let it through. */
export type WaveformBar = {
  peak: number;
  speech: boolean;
};

/**
 * The whole capture as 16 kHz mono samples, kept so it can be drawn and saved; the model only ever
 * sees the gated part of it.
 */
export class Recording {
  readonly #chunks: Float32Array[] = [];
  readonly #bars: WaveformBar[] = [];
  readonly #listeners = new Set<() => void>();
  #length = 0;
  #peak = 0;
  #speech = false;
  #filled = 0;

  get bars(): readonly WaveformBar[] {
    return this.#bars;
  }

  /** Seconds captured. */
  get duration(): number {
    return this.#length / WHISTLE_SAMPLE_RATE;
  }

  /** Appends a chunk heard with the gate `open` or closed; the chunk is copied. */
  append(samples: Float32Array, open: boolean): void {
    this.#chunks.push(samples.slice());
    this.#length += samples.length;
    for (const sample of samples) {
      this.#peak = Math.max(this.#peak, Math.abs(sample));
      this.#speech ||= open;
      if (++this.#filled === BAR_SAMPLES) {
        this.#bars.push({ peak: this.#peak, speech: this.#speech });
        this.#peak = 0;
        this.#speech = false;
        this.#filled = 0;
      }
    }
    this.#listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  }

  /** The capture as a 16-bit PCM WAV file. */
  toWav(): Blob {
    const header = new DataView(new ArrayBuffer(44));
    const dataBytes = this.#length * 2;
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

    const data = new Int16Array(this.#length);
    let offset = 0;
    for (const chunk of this.#chunks) {
      for (const sample of chunk) {
        data[offset++] = Math.max(-1, Math.min(1, sample)) * 0x7fff;
      }
    }
    return new Blob([header, data], { type: 'audio/wav' });
  }
}
