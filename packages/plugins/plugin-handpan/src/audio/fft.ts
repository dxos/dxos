//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

/** Hann window of length `size`. */
export const hannWindow = (size: number): Float32Array => {
  const window = new Float32Array(size);
  for (let index = 0; index < size; index++) {
    window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1));
  }
  return window;
};

/**
 * Iterative radix-2 FFT producing a windowed magnitude spectrum.
 * The frame is zero-padded to `size`, interpolating the spectrum so peaks can be located
 * more precisely than the frame's native bin width.
 * Buffers are preallocated because it runs once per analysis hop (~100 Hz).
 */
export class MagnitudeSpectrum {
  readonly #size: number;
  readonly #window: Float32Array;
  readonly #reverse: Uint32Array;
  readonly #cos: Float64Array;
  readonly #sin: Float64Array;
  readonly #real: Float64Array;
  readonly #imag: Float64Array;
  /** Normalizes so a full-scale sinusoid peaks near 1. */
  readonly #scale: number;

  constructor(frameSize: number, size = frameSize) {
    invariant(size > 1 && (size & (size - 1)) === 0, 'FFT size must be a power of two.');
    invariant(frameSize <= size, 'Frame must fit in the FFT.');
    this.#size = size;
    this.#window = hannWindow(frameSize);
    this.#reverse = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let index = 0; index < size; index++) {
      let reversed = 0;
      for (let bit = 0; bit < bits; bit++) {
        reversed = (reversed << 1) | ((index >> bit) & 1);
      }
      this.#reverse[index] = reversed;
    }
    this.#cos = new Float64Array(size / 2);
    this.#sin = new Float64Array(size / 2);
    for (let index = 0; index < size / 2; index++) {
      this.#cos[index] = Math.cos((2 * Math.PI * index) / size);
      this.#sin[index] = -Math.sin((2 * Math.PI * index) / size);
    }
    this.#real = new Float64Array(size);
    this.#imag = new Float64Array(size);
    this.#scale = 2 / this.#window.reduce((sum, value) => sum + value, 0);
  }

  get size() {
    return this.#size;
  }

  /** Writes `size / 2` magnitudes of `input` (one frame) into `output`. */
  compute(input: Float32Array, output: Float32Array): Float32Array {
    const size = this.#size;
    const frameSize = this.#window.length;
    const real = this.#real;
    const imag = this.#imag;
    for (let index = 0; index < size; index++) {
      real[this.#reverse[index]] = index < frameSize ? input[index] * this.#window[index] : 0;
      imag[index] = 0;
    }

    for (let span = 2; span <= size; span <<= 1) {
      const half = span >> 1;
      const step = size / span;
      for (let start = 0; start < size; start += span) {
        for (let offset = 0; offset < half; offset++) {
          const twiddleReal = this.#cos[offset * step];
          const twiddleImag = this.#sin[offset * step];
          const even = start + offset;
          const odd = even + half;
          const oddReal = real[odd] * twiddleReal - imag[odd] * twiddleImag;
          const oddImag = real[odd] * twiddleImag + imag[odd] * twiddleReal;
          real[odd] = real[even] - oddReal;
          imag[odd] = imag[even] - oddImag;
          real[even] += oddReal;
          imag[even] += oddImag;
        }
      }
    }

    for (let bin = 0; bin < size / 2; bin++) {
      output[bin] = Math.hypot(real[bin], imag[bin]) * this.#scale;
    }

    return output;
  }
}
