//
// Copyright 2026 DXOS.org
//

import { PitchDetector } from 'pitchy';

import { ChordDecomposer, type ChordTemplate, type SpectralPeak, selectNotes, spectralPeaks } from './chord.ts';
import { MagnitudeSpectrum } from './fft.ts';
import { harmonicPitch } from './harmonic.ts';
import { OnsetDetector, type OnsetDetectorOptions } from './onset.ts';
import { type Pitch } from './pitch.ts';

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
  /** Minimum MPM clarity (0–1) for a frame's pitch to be reported. */
  minClarity?: number;
  /** Minimum fraction of post-onset energy on a candidate's harmonics for a strike to be pitched. */
  minHarmonicity?: number;
  /** Minimum fraction of post-onset energy that is new since the onset. */
  minResidual?: number;
  /** RMS below which the signal is treated as silence. */
  silenceRms?: number;
  /** Seconds after an onset before the note window starts (skips the strike transient). */
  pitchDelay?: number;
  /**
   * Note window (samples, power of two). Long windows separate a new note from neighbours still
   * ringing (8192 @ 44.1 kHz resolves ~5 Hz); a note is resolved once its window fills.
   */
  noteFrameSize?: number;
  /** Number of harmonics in the partial profile. */
  partialCount?: number;
  /**
   * Seconds after an onset during which further onsets are ignored: a real strike's attack and
   * the tone blooming behind it register as two onsets, and the first would resolve as a tak.
   */
  minOnsetInterval?: number;
  onset?: Omit<OnsetDetectorOptions, 'refractoryFrames'>;
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
   * True when the full note window was available. A note cut short by the next onset is still
   * identified, but with coarser frequency resolution, so its cents are unreliable.
   */
  precise: boolean;
  /** Notes sounding together in this strike, strongest first; present only when chord templates are set. */
  chord?: Pitch[];
  /** Peaks of the energy the strike added (the struck note plus whatever rang in sympathy). */
  peaks: SpectralPeak[];
};

export type AnalyzerResult = {
  frames: AnalyzerFrame[];
  notes: NoteEvent[];
};

type PendingNote = {
  time: number;
  /** Absolute index of the first sample of the hop that triggered the onset. */
  onsetSample: number;
  velocity: number;
  clarity: number;
};

/** Shortest note window used when the next onset cuts a note short. */
const MIN_NOTE_FRAME = 1024;

/**
 * Streaming single-note analyzer. Short overlapping frames drive onset detection (spectral
 * flux) and a per-frame pitch for live display (McLeod Pitch Method). Each onset is then
 * resolved from a long window after it, minus an equal window before it, so notes still
 * ringing do not bias the new note.
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
  readonly #silenceRms: number;
  readonly #pitchDelay: number;
  readonly #noteFrameSize: number;
  readonly #partialCount: number;

  readonly #frame: Float32Array;
  readonly #magnitudes: Float32Array;
  readonly #spectrum: MagnitudeSpectrum;
  /** Note-window spectra by window length (2× zero-padded). */
  readonly #noteSpectra = new Map<number, MagnitudeSpectrum>();
  #chordTemplates: ChordTemplate[] | undefined;
  /** Decomposers by note-window length; rebuilt when the templates change. */
  readonly #chordDecomposers = new Map<number, ChordDecomposer>();
  /** Ring buffer of recent input, long enough for a note window plus the window before it. */
  readonly #history: Float32Array;
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
    silenceRms = 0.001,
    pitchDelay = 0.03,
    noteFrameSize = 8192,
    partialCount = 6,
    minOnsetInterval = 0.1,
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
    this.#silenceRms = silenceRms;
    this.#pitchDelay = pitchDelay;
    this.#noteFrameSize = noteFrameSize;
    this.#partialCount = partialCount;

    this.#frame = new Float32Array(frameSize);
    this.#spectrum = new MagnitudeSpectrum(frameSize, frameSize * padding);
    this.#magnitudes = new Float32Array(this.#spectrum.size / 2);
    this.#history = new Float32Array(3 * noteFrameSize + Math.ceil(pitchDelay * sampleRate));
    this.#onsets = new OnsetDetector({
      ...onset,
      refractoryFrames: Math.ceil((minOnsetInterval * sampleRate) / hopSize),
    });
    this.#pitch = PitchDetector.forFloat32Array(frameSize);
    this.#pitch.minVolumeAbsolute = silenceRms;
  }

  get sampleRate() {
    return this.#sampleRate;
  }

  /** Strike sensitivity (0–1); the default 0.7 matches the onset margin the analyzer is tuned for. */
  setSensitivity(sensitivity: number): void {
    this.#onsets.setDelta(sensitivityToDelta(sensitivity));
  }

  /** Enables chord detection against these note templates (`undefined` disables it). */
  setChordTemplates(templates: ChordTemplate[] | undefined): void {
    this.#chordTemplates = templates?.length ? templates : undefined;
    this.#chordDecomposers.clear();
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
      const hop = buffer.subarray(offset, offset + this.#hopSize);
      this.#frame.set(hop, this.#frameSize - this.#hopSize);
      for (let index = 0; index < hop.length; index++) {
        this.#history[(this.#samplesProcessed + index) % this.#history.length] = hop[index];
      }
      offset += this.#hopSize;
      this.#samplesProcessed += this.#hopSize;
      this.#processFrame(result);
    }

    this.#pending = buffer.slice(offset);
    return result;
  }

  /** Resolves any note whose window has not yet filled (e.g. when capture stops). */
  flush(): NoteEvent[] {
    const note = this.#note && this.#resolve(this.#note, this.#samplesProcessed);
    this.#note = undefined;
    return note ? [note] : [];
  }

  #processFrame(result: AnalyzerResult): void {
    const time = this.#samplesProcessed / this.#sampleRate;
    const rms = computeRms(this.#frame);
    const audible = rms >= this.#silenceRms;

    this.#spectrum.compute(this.#frame, this.#magnitudes);
    // Until the first frame is full, the zero-filled window ramping up would read as an onset.
    const warm = this.#samplesProcessed >= 2 * this.#frameSize;
    const { flux, onset } = this.#onsets.process(this.#magnitudes, audible && warm);

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
      const onsetSample = this.#samplesProcessed - this.#hopSize;
      if (this.#note) {
        result.notes.push(this.#resolve(this.#note, onsetSample));
      }
      this.#note = { time, onsetSample, velocity: rms, clarity };
      return;
    }

    const note = this.#note;
    if (note) {
      note.velocity = Math.max(note.velocity, rms);
      note.clarity = Math.max(note.clarity, clarity);
      if (this.#samplesProcessed >= this.#noteStart(note) + this.#noteFrameSize) {
        result.notes.push(this.#resolve(note, this.#samplesProcessed));
        this.#note = undefined;
      }
    }
  }

  #noteStart(note: PendingNote): number {
    return note.onsetSample + Math.round(this.#pitchDelay * this.#sampleRate);
  }

  /**
   * Resolves a note from the window after its onset (ending no later than `end`), minus the
   * spectrum of an equal window before the onset: the residual holds only the new note's energy.
   */
  #resolve(note: PendingNote, end: number): NoteEvent {
    const start = this.#noteStart(note);
    const available = Math.min(this.#noteFrameSize, end - start);
    let length = MIN_NOTE_FRAME;
    while (length * 2 <= available) {
      length *= 2;
    }

    const spectrum = this.#noteSpectrum(length);
    const binWidth = this.#sampleRate / spectrum.size;
    const after = spectrum.compute(this.#read(start, length), new Float32Array(spectrum.size / 2));
    const before = spectrum.compute(this.#read(note.onsetSample - length, length), new Float32Array(spectrum.size / 2));
    let residualEnergy = 0;
    let afterEnergy = 0;
    const residual = after.map((value, bin) => {
      const increase = Math.max(0, value - before[bin]);
      residualEnergy += increase;
      afterEnergy += value;
      return increase;
    });

    const pitch = harmonicPitch(residual, binWidth, {
      minFrequency: this.#minFrequency,
      maxFrequency: this.#maxFrequency,
      lobe: 4,
    });
    const event = { time: note.time, clarity: note.clarity, velocity: note.velocity };
    const percussive = { ...event, partials: [], peaks: [], percussive: true, precise: false };
    if (residualEnergy < this.#minResidual * afterEnergy) {
      return percussive;
    }

    // With note templates, "pitched" means the templates explain the strike: several notes plus their
    // resonance spread energy too widely for a single pitch's harmonicity to pass.
    const chord = this.#chordTemplates ? this.#decompose(residual, length) : undefined;
    const pitched = chord
      ? chord.fit >= MIN_CHORD_FIT && chord.notes.length > 0
      : pitch !== undefined && pitch.harmonicity >= this.#minHarmonicity;
    if (!pitched) {
      return percussive;
    }

    const frequency = pitch?.frequency ?? chord?.frequency;
    return {
      ...event,
      frequency,
      partials: frequency !== undefined ? partialProfile(residual, frequency, binWidth, this.#partialCount) : [],
      peaks: spectralPeaks(residual, binWidth),
      percussive: false,
      precise: length >= this.#noteFrameSize,
      chord: chord?.notes,
    };
  }

  #decompose(residual: Float32Array, length: number): { notes: Pitch[]; fit: number; frequency?: number } {
    const templates = this.#chordTemplates;
    if (!templates) {
      return { notes: [], fit: 0 };
    }
    const decomposer = this.#decomposer(length, templates);
    const { weights, fit } = decomposer.analyze(residual);
    const notes = selectNotes(weights, { relative: CHORD_RELATIVE });
    const strongest = templates.find(({ pitch }) => pitch === notes[0]);
    return { notes, fit, frequency: strongest?.frequency };
  }

  #decomposer(frameSize: number, templates: ChordTemplate[]): ChordDecomposer {
    let decomposer = this.#chordDecomposers.get(frameSize);
    if (!decomposer) {
      decomposer = new ChordDecomposer(templates, { sampleRate: this.#sampleRate, frameSize });
      this.#chordDecomposers.set(frameSize, decomposer);
    }
    return decomposer;
  }

  #noteSpectrum(length: number): MagnitudeSpectrum {
    let spectrum = this.#noteSpectra.get(length);
    if (!spectrum) {
      spectrum = new MagnitudeSpectrum(length, length * 2);
      this.#noteSpectra.set(length, spectrum);
    }
    return spectrum;
  }

  /** Copies `length` samples starting at absolute index `start` (zeros before the stream began). */
  #read(start: number, length: number): Float32Array {
    const output = new Float32Array(length);
    for (let index = 0; index < length; index++) {
      const sample = start + index;
      if (sample >= 0 && sample < this.#samplesProcessed) {
        output[index] = this.#history[sample % this.#history.length];
      }
    }
    return output;
  }
}

export const DEFAULT_SENSITIVITY = 0.7;

/** A note belongs to the chord when its weight is at least this fraction of the strongest. */
const CHORD_RELATIVE = 0.2;

/** Fraction of a strike's new energy the note templates must explain for it to count as pitched. */
const MIN_CHORD_FIT = 0.5;

/** Maps sensitivity 0–1 to an onset flux margin of 0.31 (least) … 0.01 (most); 0.7 → 0.1. */
const sensitivityToDelta = (sensitivity: number): number => 0.01 + 0.3 * (1 - Math.max(0, Math.min(1, sensitivity)));

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
