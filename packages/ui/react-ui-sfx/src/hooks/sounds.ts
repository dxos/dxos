//
// Copyright 2025 DXOS.org
//

import * as Tone from 'tone';

export interface Sound {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * https://tonejs.github.io
 * https://tonejs.github.io/docs/r13/AudioNode
 */
// TODO(burdon): Collaborative drum machine?
export const createPattern = (): Sound => {
  const kick = createKick();
  const snare = createSnare();

  const kickPattern = new Tone.Sequence(
    (time, hit) => hit && kick.trigger(time),
    [
      ['C4', null, null, null],
      ['C4', null, null, null],
      ['C4', 'C4', 'C4', 'C4'],
      ['C4', 'C4', 'C4', 'C4'],
      ['C4', null, null, null],
      ['C4', null, null, null],
      ['C4', null, null, null],
      ['C4', null, null, null],
    ].flat(),
    '16n',
  );

  const snarePattern = new Tone.Sequence(
    (time, hit) => hit && snare.trigger(time),
    [
      [null, null, null, null],
      ['C4', null, null, null],
      [null, null, null, null],
      ['C4', null, null, null],
      [null, null, null, null],
      ['C4', null, null, null],
      [null, null, null, null],
      ['C4', null, null, null],
    ].flat(),
    '16n',
  );
  snarePattern.humanize = '128n';

  return {
    start: async () => {
      await Tone.start();

      kickPattern.start(0);
      snarePattern.start(0);

      Tone.getTransport().bpm.value = 130;
      Tone.getTransport().start();
    },
    stop: async () => {
      kickPattern.stop();
      snarePattern.stop();

      Tone.getTransport().stop();
    },
  };
};

function createKick() {
  const osc = new Tone.Oscillator({ type: 'sine' });
  const gain = new Tone.Gain(1).toDestination();

  const env = new Tone.AmplitudeEnvelope({
    attack: 0.0001,
    decay: 0.16,
    sustain: 0.0,
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
    trigger: (time?: number | string) => {
      env.triggerAttackRelease('16n', time);
      pitchEnv.triggerAttackRelease('16n', time);
    },
  };
}

function createSnare() {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0.1, release: 0.1 },
  });

  const noiseFilter = new Tone.Filter({ type: 'highpass', frequency: 1800, rolloff: -24 });
  noise.connect(noiseFilter);

  const tone = new Tone.Oscillator('200hz', 'triangle');
  const toneEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 });
  tone.connect(toneEnv);

  const bus = new Tone.Gain().toDestination();
  noiseFilter.connect(bus);
  toneEnv.connect(bus);

  tone.start();

  return {
    trigger: (time?: number | string) => {
      noise.triggerAttackRelease('16n', time);
      toneEnv.triggerAttackRelease('16n', time);
    },
  };
}
