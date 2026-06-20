//
// Copyright 2025 DXOS.org
//

import * as Tone from 'tone';

/**
 * Experimental sound engine.
 * https://tonejs.github.io
 * https://tonejs.github.io/docs/r13/AudioNode
 */

export interface Sound {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export type DrumName = 'kick' | 'snare' | 'hat' | 'openhat' | 'clap' | 'crash' | 'ride' | 'tomLo' | 'tomMid' | 'tomHi';

export type DrumOptions = {
  gain?: number;
  /**
   * Tone node to route the drum's gain stage into. When omitted the drum
   * connects directly to `Tone.Destination` (the speakers). Provide a master
   * bus here to let an analyzer / oscilloscope tap drum hits as well.
   */
  destination?: Tone.ToneAudioNode;
};

const connectGain = (gain: Tone.Gain, destination?: Tone.ToneAudioNode): Tone.Gain => {
  if (destination) {
    gain.connect(destination);
  } else {
    gain.toDestination();
  }
  return gain;
};

export type DrumVoice = {
  /** `time` is a Tone scheduling time — pass the value Tone hands the Sequence callback. */
  trigger: (time?: number | string, velocity?: number) => void;
  dispose: () => void;
};

/**
 * Factory for a single drum-kit voice keyed by name. Returns a tiny object with
 * `trigger(time, velocity)` and `dispose()`. Used by ScorePlayer to back drum patches.
 */
export const createDrum = (name: DrumName, options: DrumOptions = {}): DrumVoice => {
  switch (name) {
    case 'kick':
      return createKickVoice(options);
    case 'snare':
      return createSnareVoice(options);
    case 'hat':
      return createHatVoice({ ...options, open: false });
    case 'openhat':
      return createHatVoice({ ...options, open: true });
    case 'clap':
      return createClapVoice(options);
    case 'crash':
    case 'ride':
      return createCymbalVoice({ ...options, sustain: name === 'ride' ? 0.4 : 0.6 });
    case 'tomLo':
      return createTomVoice({ ...options, frequency: 100 });
    case 'tomMid':
      return createTomVoice({ ...options, frequency: 160 });
    case 'tomHi':
      return createTomVoice({ ...options, frequency: 220 });
  }
};

function createKickVoice(options: DrumOptions = {}): DrumVoice {
  const osc = new Tone.Oscillator({ type: 'sine' });
  const gain = connectGain(new Tone.Gain(options.gain ?? 1), options.destination);
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.0001,
    decay: 0.16,
    sustain: 0,
    release: 0.1,
  }).connect(gain);
  const pitchEnv = new Tone.FrequencyEnvelope({
    attack: 0.0001,
    decay: 0.07,
    sustain: 0,
    release: 0.05,
    baseFrequency: 20,
    octaves: 4,
  });
  osc.connect(env);
  pitchEnv.connect(osc.frequency);
  osc.start();
  return {
    trigger: (time, velocity = 1) => {
      env.triggerAttackRelease('16n', time, velocity);
      pitchEnv.triggerAttackRelease('16n', time);
    },
    dispose: () => {
      osc.dispose();
      env.dispose();
      pitchEnv.dispose();
      gain.dispose();
    },
  };
}

function createSnareVoice(options: DrumOptions = {}): DrumVoice {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0.1, release: 0.1 },
  });
  const noiseFilter = new Tone.Filter({ type: 'highpass', frequency: 1800, rolloff: -24 });
  noise.connect(noiseFilter);
  const tone = new Tone.Oscillator('200hz', 'triangle');
  const toneEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 });
  tone.connect(toneEnv);
  const bus = connectGain(new Tone.Gain(options.gain ?? 1), options.destination);
  noiseFilter.connect(bus);
  toneEnv.connect(bus);
  tone.start();
  return {
    trigger: (time, velocity = 1) => {
      noise.triggerAttackRelease('16n', time, velocity);
      toneEnv.triggerAttackRelease('16n', time, velocity);
    },
    dispose: () => {
      noise.dispose();
      noiseFilter.dispose();
      tone.dispose();
      toneEnv.dispose();
      bus.dispose();
    },
  };
}

type HatOptions = DrumOptions & { open?: boolean };

function createHatVoice(options: HatOptions = {}): DrumVoice {
  const decay = options.open ? 0.4 : 0.05;
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay, sustain: 0, release: decay / 2 },
  });
  const filter = new Tone.Filter({ type: 'highpass', frequency: 8000, rolloff: -24 });
  const gain = connectGain(new Tone.Gain(options.gain ?? 0.4), options.destination);
  noise.connect(filter);
  filter.connect(gain);
  return {
    trigger: (time, velocity = 1) => noise.triggerAttackRelease('32n', time, velocity),
    dispose: () => {
      noise.dispose();
      filter.dispose();
      gain.dispose();
    },
  };
}

function createClapVoice(options: DrumOptions = {}): DrumVoice {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.08 },
  });
  const filter = new Tone.Filter({ type: 'bandpass', frequency: 1200, Q: 1.5 });
  const gain = connectGain(new Tone.Gain(options.gain ?? 0.6), options.destination);
  noise.connect(filter);
  filter.connect(gain);
  return {
    trigger: (time, velocity = 1) => noise.triggerAttackRelease('16n', time, velocity),
    dispose: () => {
      noise.dispose();
      filter.dispose();
      gain.dispose();
    },
  };
}

type CymbalOptions = DrumOptions & { sustain?: number };

function createCymbalVoice(options: CymbalOptions = {}): DrumVoice {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: options.sustain ?? 0.5, sustain: 0, release: 0.5 },
  });
  const filter = new Tone.Filter({ type: 'highpass', frequency: 6000, rolloff: -24 });
  const gain = connectGain(new Tone.Gain(options.gain ?? 0.3), options.destination);
  noise.connect(filter);
  filter.connect(gain);
  return {
    trigger: (time, velocity = 1) => noise.triggerAttackRelease('8n', time, velocity),
    dispose: () => {
      noise.dispose();
      filter.dispose();
      gain.dispose();
    },
  };
}

type TomOptions = DrumOptions & { frequency: number };

function createTomVoice(options: TomOptions): DrumVoice {
  const osc = new Tone.Oscillator({ type: 'sine', frequency: options.frequency });
  const env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 });
  const pitchEnv = new Tone.FrequencyEnvelope({
    attack: 0.0001,
    decay: 0.12,
    sustain: 0,
    release: 0.05,
    baseFrequency: options.frequency,
    octaves: 1.5,
  });
  const gain = connectGain(new Tone.Gain(options.gain ?? 0.8), options.destination);
  osc.connect(env);
  env.connect(gain);
  pitchEnv.connect(osc.frequency);
  osc.start();
  return {
    trigger: (time, velocity = 1) => {
      env.triggerAttackRelease('8n', time, velocity);
      pitchEnv.triggerAttackRelease('8n', time);
    },
    dispose: () => {
      osc.dispose();
      env.dispose();
      pitchEnv.dispose();
      gain.dispose();
    },
  };
}
