//
// Copyright 2025 DXOS.org
//

import * as Tone from 'tone';

const BASE_OCTAVE = 3;
const PENTATONIC_SCALE = ['C', 'D', 'E', 'G', 'A'] as const;
const TRIAD_SEMITONES = [0, 4, 7] as const;

/**
 * https://tonejs.github.io/
 */
// TODO(burdon): Create synth story.
// TODO(burdon): D3 animation with notes struck when balls collide.
export class Sounds {
  private sync?: Tone.PolySynth;

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
}
