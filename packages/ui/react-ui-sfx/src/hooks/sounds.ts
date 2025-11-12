//
// Copyright 2025 DXOS.org
//

import * as Tone from 'tone';

const BASE_OCTAVE = 3;
const PENTATONIC_SCALE = ['C', 'D', 'E', 'G', 'A'] as const;
const TRIAD_SEMITONES = [0, 4, 7] as const;

/**
 * https://tonejs.github.io
 * https://tonejs.github.io/docs/r13/AudioNode
 */
// TODO(burdon): Create synth story.
// TDOD(burdon): Waveform animation.
// TODO(burdon): D3 animation with notes struck when balls collide.
export class Sounds {
  private sync?: Tone.PolySynth;

  private masterVolume = -10; // dB
  private pitchMultiplier = 1;

  constructor() {
    const volume = new Tone.Volume(0).toDestination();

    // const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 });
    // const distortion = new Tone.Distortion({ distortion: 0.8, wet: 1.0 });
    // const transport = Tone.getTransport();

    this.sync = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 1.2 },
    })
      // .connect(reverb)
      // .connect(distortion)
      .connect(volume);
  }

  async init() {
    await Tone.start();
  }

  createNode() {
    const chordBaseOctave = BASE_OCTAVE + 1;
    const currentNoteIndex = 0;
    const chordBaseIndex = currentNoteIndex % PENTATONIC_SCALE.length;
    const rootNoteName = PENTATONIC_SCALE[chordBaseIndex];
    const rootNoteStr = `${rootNoteName}${chordBaseOctave}`;
    const semitoneOffset = TRIAD_SEMITONES[Math.floor(Math.random() * TRIAD_SEMITONES.length)];
    const note = Tone.Frequency(rootNoteStr).transpose(semitoneOffset).toNote();
    return note;
  }

  play() {
    const note = this.createNode();
    this.sync?.triggerAttackRelease(note, '4n');
  }

  blip() {
    const click = new Tone.Oscillator({
      type: 'square',
      frequency: 880,
    }).connect(new Tone.Gain(0.1).toDestination());

    const now = Tone.now();
    click.start(now);
    click.stop(now + 0.02);
  }

  click() {
    // Very short attack/decay.
    const envelope = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.02,
      sustain: 0,
      release: 0.005,
    }).toDestination();

    // Filter out low frequencies.
    const filter = new Tone.Filter({ type: 'highpass', frequency: 1000 });

    const now = Tone.now();
    const noise = new Tone.Noise('white');
    noise.connect(envelope).connect(filter);
    noise.start(now);
    envelope.triggerAttack(now);
    noise.stop(now + 0.05);
  }

  clack() {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.3, release: 1 },
    }).toDestination();

    const lfo = new Tone.LFO({
      frequency: 1.5,
      min: 220,
      max: 260,
    }).connect(synth.frequency);

    const transport = Tone.getTransport();
    transport.scheduleRepeat((time) => {
      synth.triggerAttackRelease(240, '1n', time);
    }, '2n');

    const now = Tone.now();
    lfo.start(now);
    transport.start(now).stop(now + 0.5);
  }

  laser() {
    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    synth.volume.value = this.masterVolume;
    synth.frequency.exponentialRampTo(100 * this.pitchMultiplier, 0.2);
    synth.triggerAttackRelease(800 * this.pitchMultiplier, '8n');
  }

  pling() {
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.volume.value = this.masterVolume;
    const notes = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    let time = 0;
    notes.forEach((note) => {
      const freq = Tone.Frequency(note).toFrequency() * this.pitchMultiplier;
      synth.triggerAttackRelease(freq, '16n', `+${time}`);
      time += 0.05;
    });
  }

  notify() {
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
    }).toDestination();
    synth.volume.value = this.masterVolume;
    synth.triggerAttackRelease(880 * this.pitchMultiplier, '16n'); // A
    setTimeout(() => {
      synth.triggerAttackRelease(1320 * this.pitchMultiplier, '8n'); // E
    }, 100);
  }
}
