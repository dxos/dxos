//
// Copyright 2026 DXOS.org
//

import {
  BANDS,
  type FrameTime,
  HIGHEST_HZ,
  LINEAR_HIGHEST_HZ,
  LINEAR_POINTS,
  LOWEST_HZ,
  type SignalProvider,
  type SignalSink,
} from '../signals.ts';

/** Seconds for a level to rise toward a louder voice and fall back; speech rises fast and decays slowly. */
const ATTACK = 0.04;
const RELEASE = 0.25;
/** A rise in loudness this steep within one frame counts as a syllable onset. */
const ONSET_RISE = 0.12;

/**
 * Writes the `voice` slice from an audio track: loudness, low and high bands, and the log and linear spectra, all
 * smoothed. Analysing the same track a call plays keeps picture and sound in step, whatever the voice's source.
 */
export class AudioProvider implements SignalProvider {
  readonly id = 'audio';
  readonly #context: AudioContext;
  readonly #track: MediaStreamTrack;
  #sink?: SignalSink;
  #analyser?: AnalyserNode;
  #waveform = new Float32Array(0);
  #spectrum = new Uint8Array(0);
  #edges: number[] = [];
  #linearEdges: number[] = [];
  #level = 0;
  #low = 0;
  #high = 0;
  readonly #bands = new Array<number>(BANDS).fill(0);
  readonly #linear = new Array<number>(LINEAR_POINTS).fill(0);

  constructor(context: AudioContext, track: MediaStreamTrack) {
    this.#context = context;
    this.#track = track;
  }

  start(sink: SignalSink): () => void {
    this.#sink = sink;
    const analyser = this.#context.createAnalyser();
    // 2048 points resolve about 23 Hz per bin at 48 kHz, fine enough for the lowest voice band.
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    const source = this.#context.createMediaStreamSource(new MediaStream([this.#track]));
    source.connect(analyser);
    this.#analyser = analyser;
    this.#waveform = new Float32Array(analyser.fftSize);
    this.#spectrum = new Uint8Array(analyser.frequencyBinCount);
    this.#edges = Array.from({ length: BANDS + 1 }, (_, index) =>
      this.#binOf(LOWEST_HZ * (HIGHEST_HZ / LOWEST_HZ) ** (index / BANDS)),
    );
    this.#linearEdges = Array.from({ length: LINEAR_POINTS + 1 }, (_, index) =>
      this.#binOf(LOWEST_HZ + ((LINEAR_HIGHEST_HZ - LOWEST_HZ) * index) / LINEAR_POINTS),
    );
    return () => {
      source.disconnect();
      this.#analyser = undefined;
      this.#sink = undefined;
    };
  }

  sample({ time, delta }: FrameTime): void {
    const analyser = this.#analyser;
    const sink = this.#sink;
    if (!analyser || !sink) {
      return;
    }

    analyser.getFloatTimeDomainData(this.#waveform);
    analyser.getByteFrequencyData(this.#spectrum);
    const rms = Math.sqrt(this.#waveform.reduce((sum, value) => sum + value * value, 0) / this.#waveform.length);
    const previous = this.#level;
    this.#level = smooth(this.#level, Math.min(1, rms * 3), delta);
    if (this.#level - previous > ONSET_RISE) {
      sink.emit({ type: 'onset', at: time });
    }
    this.#low = smooth(this.#low, this.#band(this.#binOf(90), this.#binOf(500)), delta);
    this.#high = smooth(this.#high, this.#band(this.#binOf(2_000), this.#binOf(8_000)), delta);
    this.#bands.forEach((value, index) => {
      this.#bands[index] = smooth(value, energy(this.#band(this.#edges[index], this.#edges[index + 1])), delta);
    });
    this.#linear.forEach((value, index) => {
      this.#linear[index] = smooth(
        value,
        energy(this.#band(this.#linearEdges[index], this.#linearEdges[index + 1])),
        delta,
      );
    });
    sink.set('voice', {
      level: this.#level,
      low: this.#low,
      high: this.#high,
      bands: this.#bands,
      linear: this.#linear,
    });
  }

  #binOf(hz: number): number {
    return Math.min(
      this.#spectrum.length - 1,
      Math.round((hz / (this.#context.sampleRate / 2)) * this.#spectrum.length),
    );
  }

  #band(from: number, to: number): number {
    let sum = 0;
    for (let index = from; index < Math.max(to, from + 1); index++) {
      sum += this.#spectrum[index];
    }
    return sum / Math.max(1, to - from) / 255;
  }
}

const smooth = (current: number, target: number, delta: number) =>
  current + (target - current) * Math.min(1, delta / (target > current ? ATTACK : RELEASE));

/** The analyser's floor sits around a quarter of full scale, so energy is read from there up. */
const energy = (value: number) => Math.max(0, Math.min(1, (value - 0.25) / 0.5));
