//
// Copyright 2026 DXOS.org
//

import { PitchDetector } from 'pitchy';

import { MagnitudeSpectrum } from './fft.ts';
import { harmonicPitch } from './harmonic.ts';
import { OnsetDetector, type OnsetDetectorOptions } from './onset.ts';

export type AnalyzerOptions = {
  sampleRate: number;
  /** Analysis window (samples, power of two). 2048 @ 48 kHz resolves notes down to ~60 Hz. */
  frameSize?: number;
  /** Samples between successive frames. */
  hopSize?: number;
  /** Zero-padding factor for the spectrum (finer peak location). */
  padding?: number;
  minFrequency?: number;
  maxFrequency?: number;
  /** Minimum MPM clarity (0–1) for a pitch estimate to count. */
  minClarity?: number;
  /** Minimum fraction of post-onset energy on a candidate's harmonics for a strike to be pitched. */
  minHarmonicity?: number;
  /** Minimum fraction of the frame's energy that is new since the onset. */
  minResidual?: number;
  /** Pitched frames required within the window; fewer means a percussive strike. */
  minEstimates?: number;
  /** RMS below which the signal is treated as silence. */
  silenceRms?: number;
  /** Seconds after an onset before pitch estimates are collected (skips the strike transient). */
  pitchDelay?: number;
  /** Seconds over which estimates are collected before a note is resolved. */
  pitchWindow?: number;
  /** Number of harmonics in the partial profile. */
  partialCount?: number;
  onset?: OnsetDetectorOptions;
};

/** Per-hop analysis result. */
export type AnalyzerFrame = {
  /** Seconds since the analyzer started (end of the frame). */
  time: number;
  rms: number;
  flux: number;
  onset: boolean;
  /** Present when the frame has a clear pitch. */
  frequency?: number;
  clarity: number;
};

/** A resolved strike: an onset followed by its settled pitch (or none, for percussive hits). */
export type NoteEvent = {
  /** Onset time (seconds). */
  time: number;
  frequency?: number;
  clarity: number;
  /** Peak RMS following the onset. */
  velocity: number;
  /** Normalized energy at harmonics 1…n of the fundamental (sums to 1); empty when percussive. */
  partials: number[];
  percussive: boolean;
  /**
   * True when time-domain (MPM) and spectral estimates agree. A note struck while a nearby
   * pitch (within ~1 semitone) still rings is identified correctly but its cents are biased.
   */
  precise: boolean;
};

export type AnalyzerResult = {
  frames: AnalyzerFrame[];
  notes: NoteEvent[];
};

type PendingNote = {
  time: number;
  velocity: number;
  /** Spectrum just before the onset; subtracted so notes still ringing are ignored. */
  baseline: Float32Array;
  estimates: { frequency: number; precise: boolean; clarity: number; magnitudes: Float32Array }[];
};

/**
 * Streaming single-note analyzer: buffers samples into overlapping frames and runs
 * onset detection (spectral flux) and pitch detection (McLeod Pitch Method) per hop.
 * Pure and synchronous so it runs identically on captured or synthesized audio.
 */
export class Analyzer {
  readonly #sampleRate: number;
  readonly #frameSize: number;
  readonly #hopSize: number;
  readonly #minFrequency: number;
  readonly #maxFrequency: number;
  readonly #minClarity: number;
  readonly #minHarmonicity: number;
  readonly #minResidual: number;
  readonly #minEstimates: number;
  readonly #silenceRms: number;
  readonly #pitchDelay: number;
  readonly #pitchWindow: number;
  readonly #partialCount: number;

  readonly #frame: Float32Array;
  readonly #binWidth: number;
  readonly #padding: number;
  readonly #magnitudes: Float32Array;
  readonly #previousMagnitudes: Float32Array;
  readonly #residual: Float32Array;
  readonly #spectrum: MagnitudeSpectrum;
  readonly #onsets: OnsetDetector;
  readonly #pitch: PitchDetector<Float32Array>;

  /** Samples received but not yet consumed by a hop. */
  #pending = new Float32Array(0);
  #samplesProcessed = 0;
  #note: PendingNote | undefined;

  constructor({
    sampleRate,
    frameSize = 2048,
    hopSize = 512,
    padding = 4,
    minFrequency = 60,
    maxFrequency = 1400,
    minClarity = 0.85,
    minHarmonicity = 0.4,
    minResidual = 0.15,
    minEstimates = 3,
    silenceRms = 0.003,
    pitchDelay = 0.04,
    pitchWindow = 0.08,
    partialCount = 6,
    onset,
  }: AnalyzerOptions) {
    this.#sampleRate = sampleRate;
    this.#frameSize = frameSize;
    this.#hopSize = hopSize;
    this.#minFrequency = minFrequency;
    this.#maxFrequency = maxFrequency;
    this.#minClarity = minClarity;
    this.#minHarmonicity = minHarmonicity;
    this.#minResidual = minResidual;
    this.#minEstimates = minEstimates;
    this.#silenceRms = silenceRms;
    this.#pitchDelay = pitchDelay;
    this.#pitchWindow = pitchWindow;
    this.#partialCount = partialCount;

    this.#frame = new Float32Array(frameSize);
    this.#padding = padding;
    this.#spectrum = new MagnitudeSpectrum(frameSize, frameSize * padding);
    this.#binWidth = sampleRate / this.#spectrum.size;
    this.#magnitudes = new Float32Array(this.#spectrum.size / 2);
    this.#previousMagnitudes = new Float32Array(this.#spectrum.size / 2);
    this.#residual = new Float32Array(this.#spectrum.size / 2);
    this.#onsets = new OnsetDetector(onset);
    this.#pitch = PitchDetector.forFloat32Array(frameSize);
    this.#pitch.minVolumeAbsolute = silenceRms;
  }

  get sampleRate() {
    return this.#sampleRate;
  }

  /** Appends samples and returns the frames and notes completed by them. */
  push(samples: Float32Array): AnalyzerResult {
    const result: AnalyzerResult = { frames: [], notes: [] };
    const buffer = new Float32Array(this.#pending.length + samples.length);
    buffer.set(this.#pending);
    buffer.set(samples, this.#pending.length);

    let offset = 0;
    while (buffer.length - offset >= this.#hopSize) {
      this.#frame.copyWithin(0, this.#hopSize);
      this.#frame.set(buffer.subarray(offset, offset + this.#hopSize), this.#frameSize - this.#hopSize);
      offset += this.#hopSize;
      this.#samplesProcessed += this.#hopSize;
      this.#processFrame(result);
    }

    this.#pending = buffer.slice(offset);
    return result;
  }

  /** Resolves any note still collecting estimates (e.g. when capture stops). */
  flush(): NoteEvent[] {
    const note = this.#note && this.#resolve(this.#note);
    this.#note = undefined;
    return note ? [note] : [];
  }

  #processFrame(result: AnalyzerResult): void {
    const time = this.#samplesProcessed / this.#sampleRate;
    const rms = computeRms(this.#frame);
    const audible = rms >= this.#silenceRms;

    this.#previousMagnitudes.set(this.#magnitudes);
    this.#spectrum.compute(this.#frame, this.#magnitudes);
    const { flux, onset } = this.#onsets.process(this.#magnitudes, audible);

    let frequency: number | undefined;
    let clarity = 0;
    if (audible) {
      const [estimate, estimateClarity] = this.#pitch.findPitch(this.#frame, this.#sampleRate);
      clarity = estimateClarity;
      if (clarity >= this.#minClarity && estimate >= this.#minFrequency && estimate <= this.#maxFrequency) {
        frequency = estimate;
      }
    }

    result.frames.push({ time, rms, flux, onset, frequency, clarity });

    if (onset) {
      if (this.#note) {
        result.notes.push(this.#resolve(this.#note));
      }
      this.#note = { time, velocity: rms, baseline: this.#previousMagnitudes.slice(), estimates: [] };
      return;
    }

    const note = this.#note;
    if (!note) {
      return;
    }

    note.velocity = Math.max(note.velocity, rms);
    const elapsed = time - note.time;
    if (elapsed >= this.#pitchDelay) {
      const estimate = this.#estimate(note.baseline, frequency);
      if (estimate) {
        note.estimates.push({ ...estimate, clarity, magnitudes: this.#residual.slice() });
      }
    }
    if (elapsed >= this.#pitchDelay + this.#pitchWindow) {
      result.notes.push(this.#resolve(note));
      this.#note = undefined;
    }
  }

  /**
   * Pitch of the energy added since the onset. The harmonic-sum estimate on the residual
   * decides the note; the MPM estimate (more precise) is used when it agrees.
   */
  #estimate(baseline: Float32Array, mpm: number | undefined): { frequency: number; precise: boolean } | undefined {
    for (let bin = 0; bin < this.#residual.length; bin++) {
      this.#residual[bin] = Math.max(0, this.#magnitudes[bin] - baseline[bin]);
    }
    const spectral = harmonicPitch(this.#residual, this.#binWidth, {
      minFrequency: this.#minFrequency,
      maxFrequency: this.#maxFrequency,
      lobe: 2 * this.#padding,
    });
    let residual = 0;
    let current = 0;
    for (let bin = 0; bin < this.#residual.length; bin++) {
      residual += this.#residual[bin];
      current += this.#magnitudes[bin];
    }
    if (!spectral || spectral.harmonicity < this.#minHarmonicity || residual < this.#minResidual * current) {
      return undefined;
    }
    const precise = mpm !== undefined && Math.abs(1200 * Math.log2(mpm / spectral.frequency)) < 60;
    return { frequency: precise ? mpm : spectral.frequency, precise };
  }

  #resolve(note: PendingNote): NoteEvent {
    if (note.estimates.length < this.#minEstimates) {
      return { time: note.time, clarity: 0, velocity: note.velocity, partials: [], percussive: true, precise: false };
    }

    const sorted = [...note.estimates].sort((a, b) => a.frequency - b.frequency);
    const central = sorted[sorted.length >> 1];
    const clarity = Math.max(...note.estimates.map((estimate) => estimate.clarity));
    return {
      time: note.time,
      frequency: central.frequency,
      clarity,
      velocity: note.velocity,
      partials: partialProfile(central.magnitudes, central.frequency, this.#binWidth, this.#partialCount),
      percussive: false,
      precise: note.estimates.filter((estimate) => estimate.precise).length * 2 >= note.estimates.length,
    };
  }
}

const computeRms = (frame: Float32Array): number => {
  let sum = 0;
  for (let index = 0; index < frame.length; index++) {
    sum += frame[index] * frame[index];
  }
  return Math.sqrt(sum / frame.length);
};

/**
 * Peak magnitude near each harmonic k·f0 (±3%, at least ±1 bin), normalized to sum to 1.
 * Captures the instrument's timbre — handpan tone fields are tuned to 1 : 2 : 3.
 */
export const partialProfile = (
  magnitudes: Float32Array,
  fundamental: number,
  binWidth: number,
  count: number,
): number[] => {
  const profile: number[] = [];
  for (let harmonic = 1; harmonic <= count; harmonic++) {
    const center = (harmonic * fundamental) / binWidth;
    const spread = Math.max(1, center * 0.03);
    const low = Math.max(0, Math.floor(center - spread));
    const high = Math.min(magnitudes.length - 1, Math.ceil(center + spread));
    let peak = 0;
    for (let bin = low; bin <= high; bin++) {
      peak = Math.max(peak, magnitudes[bin]);
    }
    profile.push(peak);
  }
  const total = profile.reduce((sum, value) => sum + value, 0);
  return total > 0 ? profile.map((value) => value / total) : profile;
};
