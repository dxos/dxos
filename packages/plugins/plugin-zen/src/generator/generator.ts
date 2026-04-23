//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export type BrainwavePreset = 'delta' | 'theta' | 'alpha' | 'beta';

/** Effect Schema for binaural generator configuration. */
export const BinauralConfigSchema = Schema.Struct({
  preset: Schema.Literal('delta', 'theta', 'alpha', 'beta').annotations({
    description: 'Brainwave preset.',
  }),
  baseFrequency: Schema.Number.annotations({
    description: 'Carrier frequency (Hz).',
  }),
  beatFrequency: Schema.Number.annotations({
    description: 'Beat frequency (Hz).',
  }),
  volume: Schema.Number.annotations({
    description: 'Master volume (0-1).',
  }),
  noiseEnabled: Schema.Boolean.annotations({
    description: 'Enable pink noise.',
  }),
  noiseVolume: Schema.Number.annotations({
    description: 'Noise volume (0-1).',
  }),
});

/** Configuration for the binaural beat generator. */
export type BinauralConfig = Schema.Schema.Type<typeof BinauralConfigSchema>;

/** Brainwave frequency ranges. */
export const BRAINWAVE_PRESETS: Record<BrainwavePreset, { beatFrequency: number; label: string }> = {
  delta: {
    beatFrequency: 2,
    label: 'Delta (deep sleep)',
  },
  theta: {
    beatFrequency: 6,
    label: 'Theta (light sleep)',
  },
  alpha: {
    beatFrequency: 10,
    label: 'Alpha (relaxation)',
  },
  beta: {
    beatFrequency: 20,
    label: 'Beta (focus)',
  },
};

export const DEFAULT_CONFIG: BinauralConfig = {
  preset: 'delta',
  baseFrequency: 100,
  beatFrequency: 2,
  volume: 0.3,
  noiseEnabled: false,
  noiseVolume: 0.15,
};

/**
 * Procedural binaural beat generator using Web Audio API.
 * Accepts an external AudioContext and destination node for routing through a shared audio graph.
 */
export class BinauralGenerator {
  private _context: AudioContext;
  private _destination: AudioNode;
  private _leftOscillator: OscillatorNode | undefined;
  private _rightOscillator: OscillatorNode | undefined;
  private _noiseSource: AudioBufferSourceNode | undefined;
  private _noiseGain: GainNode | undefined;
  private _masterGain: GainNode | undefined;
  private _merger: ChannelMergerNode | undefined;
  private _playing = false;
  private _config: BinauralConfig;

  constructor(context: AudioContext, destination: AudioNode, config?: Partial<BinauralConfig>) {
    this._context = context;
    this._destination = destination;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get playing(): boolean {
    return this._playing;
  }

  get config(): BinauralConfig {
    return { ...this._config };
  }

  /** Update configuration. Applies changes in real-time if playing. */
  setConfig(config: Partial<BinauralConfig>): void {
    this._config = { ...this._config, ...config };
    if (this._playing) {
      this._applyConfig();
    }
  }

  /** Start audio playback. */
  async start(): Promise<void> {
    if (this._playing) {
      return;
    }

    this._merger = this._context.createChannelMerger(2);
    this._masterGain = this._context.createGain();
    this._masterGain.gain.value = 0;

    // Left oscillator.
    this._leftOscillator = this._context.createOscillator();
    this._leftOscillator.type = 'sine';
    const leftGain = this._context.createGain();
    this._leftOscillator.connect(leftGain);
    leftGain.connect(this._merger, 0, 0);

    // Right oscillator.
    this._rightOscillator = this._context.createOscillator();
    this._rightOscillator.type = 'sine';
    const rightGain = this._context.createGain();
    this._rightOscillator.connect(rightGain);
    rightGain.connect(this._merger, 0, 1);

    this._merger.connect(this._masterGain);

    // Pink noise layer.
    if (this._config.noiseEnabled) {
      this._createNoiseSource();
    }

    // Route to shared destination.
    this._masterGain.connect(this._destination);

    // Set frequencies before starting.
    const { baseFrequency, beatFrequency } = this._config;
    this._leftOscillator.frequency.value = baseFrequency;
    this._rightOscillator.frequency.value = baseFrequency + beatFrequency;

    this._leftOscillator.start();
    this._rightOscillator.start();

    // Fade in.
    const now = this._context.currentTime;
    this._masterGain.gain.setTargetAtTime(this._config.volume, now, 0.15);

    if (this._noiseGain) {
      this._noiseGain.gain.value = 0;
      this._noiseGain.gain.setTargetAtTime(this._config.noiseVolume, now, 0.15);
    }

    this._playing = true;
  }

  /** Stop audio playback and release nodes. */
  async stop(): Promise<void> {
    if (!this._playing) {
      return;
    }

    this._leftOscillator?.stop();
    this._rightOscillator?.stop();
    this._noiseSource?.stop();
    this._masterGain?.disconnect();

    this._leftOscillator = undefined;
    this._rightOscillator = undefined;
    this._noiseSource = undefined;
    this._noiseGain = undefined;
    this._masterGain = undefined;
    this._merger = undefined;
    this._playing = false;
  }

  /** Apply current config to live audio nodes. */
  private _applyConfig(): void {
    const { baseFrequency, beatFrequency, volume } = this._config;
    const now = this._context.currentTime;
    const rampTime = 0.05;

    this._leftOscillator!.frequency.setTargetAtTime(baseFrequency, now, rampTime);
    this._rightOscillator!.frequency.setTargetAtTime(baseFrequency + beatFrequency, now, rampTime);
    this._masterGain!.gain.setTargetAtTime(volume, now, rampTime);

    if (this._noiseGain) {
      this._noiseGain.gain.setTargetAtTime(this._config.noiseVolume, now, rampTime);
    }
  }

  /** Create a pink noise buffer source. */
  private _createNoiseSource(): void {
    const bufferSize = this._context.sampleRate * 2;
    const buffer = this._context.createBuffer(1, bufferSize, this._context.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink noise via Paul Kellet's refined method.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }

    this._noiseSource = this._context.createBufferSource();
    this._noiseSource.buffer = buffer;
    this._noiseSource.loop = true;
    this._noiseGain = this._context.createGain();
    this._noiseGain.gain.value = 0;
    this._noiseSource.connect(this._noiseGain);
    this._noiseGain.connect(this._masterGain!);
    this._noiseSource.start();
  }
}
