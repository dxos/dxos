//
// Copyright 2026 DXOS.org
//

// Sound effects, synthesised with the Web Audio API so there are no files to license or load. Scenes name a sound
// (`sound` in views.js); it starts as the scene does and fades out when the scene is left.
//
// Browsers only allow sound after a user gesture: the first click or key press starts the audio and plays the
// current scene's sound, so an opening scene can be heard with a click on the page. `M` mutes and unmutes.

// A choir "aah": a high D major chord (alto to soprano), each note sung by a section of voices (sawtooths detuned
// across a spread, each with its own vibrato and place in the stereo field) for a chorus, shaped by the formants of an
// open "aah" vowel, into a long reverb.
const CHOIR_NOTES = [293.66, 440, 587.33, 739.99, 880, 1174.66];
// Voices per note, and how far (cents) the section spreads either side of the note.
const SECTION = 5;
const SECTION_SPREAD = 14;
// The "aah" vowel: formant frequency, strength and bandwidth (Hz), sung bright.
const AAH_FORMANTS = [
  [850, 1, 70],
  [1220, 0.8, 80],
  [2810, 0.45, 110],
  [3500, 0.25, 140],
];
// The choir swells in, holds, and is gone by `CHOIR_LENGTH` seconds.
const CHOIR_ATTACK = 1;
const CHOIR_LENGTH = 5;
const CHOIR_FADE = 1.5;
// How loud the breath (noise sung through the same vowel) sits under the voices.
const BREATH = 0.35;
const RELEASE = 1.5;

/** A decaying noise burst, for a convolver: a hall of about `seconds`. */
const impulse = (context, seconds) => {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index++) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 3;
    }
  }
  return buffer;
};

/** Two seconds of white noise, looped for breath. */
const breathNoise = (context) => {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index++) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
};

const choir = (context, out) => {
  const now = context.currentTime;
  const level = context.createGain();
  level.gain.setValueAtTime(0, now);
  level.gain.linearRampToValueAtTime(0.5, now + CHOIR_ATTACK);
  level.gain.setValueAtTime(0.5, now + CHOIR_LENGTH - CHOIR_FADE);
  level.gain.linearRampToValueAtTime(0, now + CHOIR_LENGTH);
  // The vowel: parallel band-passes at the formants, mixed by their strengths.
  const vowel = context.createGain();
  for (const [frequency, gain, width] of AAH_FORMANTS) {
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = frequency;
    band.Q.value = frequency / width;
    const strength = context.createGain();
    strength.gain.value = gain;
    vowel.connect(band).connect(strength).connect(level);
  }
  level.connect(out);
  const sources = [];
  // Breath: noise through the same vowel, high-passed so it is air rather than rumble.
  const noise = context.createBufferSource();
  noise.buffer = breathNoise(context);
  noise.loop = true;
  const air = context.createBiquadFilter();
  air.type = 'highpass';
  air.frequency.value = 600;
  const breath = context.createGain();
  breath.gain.value = BREATH;
  noise.connect(air).connect(breath).connect(vowel);
  noise.start(now);
  noise.stop(now + CHOIR_LENGTH + 0.1);
  sources.push(noise);
  for (const note of CHOIR_NOTES) {
    for (let singer = 0; singer < SECTION; singer++) {
      const voice = context.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.value = note;
      voice.detune.value = ((singer / (SECTION - 1)) * 2 - 1) * SECTION_SPREAD + (Math.random() - 0.5) * 4;
      // A slow, different vibrato per singer, so the section breathes rather than buzzes.
      const vibrato = context.createOscillator();
      vibrato.frequency.value = 4.2 + Math.random() * 1.6;
      const depth = context.createGain();
      depth.gain.value = 8 + Math.random() * 6;
      vibrato.connect(depth).connect(voice.detune);
      const gain = context.createGain();
      gain.gain.value = 0.11 / SECTION;
      // Singers spread across the stereo field, so the chorus is wide.
      const pan = context.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      voice.connect(gain).connect(pan).connect(vowel);
      voice.start(now);
      vibrato.start(now);
      voice.stop(now + CHOIR_LENGTH + 0.1);
      vibrato.stop(now + CHOIR_LENGTH + 0.1);
      sources.push(voice, vibrato);
    }
  }
  return {
    stop: () => {
      const end = context.currentTime;
      level.gain.cancelScheduledValues(end);
      level.gain.setValueAtTime(level.gain.value, end);
      level.gain.linearRampToValueAtTime(0, end + RELEASE);
      for (const source of sources) {
        // A second stop() reschedules the end; on a source that has already ended it does nothing.
        source.stop(end + RELEASE + 0.1);
      }
    },
  };
};

// A startup chord: one wide, warm major chord struck at once (an original voicing, not any product's chime), each note
// a sine with a few soft overtones, quick to sound and slow to ring out.
const CHORD_NOTES = [65.41, 130.81, 196, 261.63, 329.63, 392, 523.25];
const CHORD_PARTIALS = [
  [1, 1],
  [2, 0.35],
  [3, 0.12],
];
const CHORD_DECAY = 5;

const chord = (context, out) => {
  const now = context.currentTime;
  const level = context.createGain();
  level.gain.setValueAtTime(0, now);
  level.gain.linearRampToValueAtTime(0.35, now + 0.04);
  level.gain.exponentialRampToValueAtTime(0.001, now + CHORD_DECAY);
  // A gentle low-pass that closes as the chord rings, so it mellows rather than just quietens.
  const tone = context.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(5000, now);
  tone.frequency.exponentialRampToValueAtTime(900, now + CHORD_DECAY);
  tone.connect(level).connect(out);
  const sources = [];
  for (const note of CHORD_NOTES) {
    for (const [multiple, gain] of CHORD_PARTIALS) {
      const voice = context.createOscillator();
      voice.frequency.value = note * multiple;
      // A hair of detune per note, so the chord shimmers.
      voice.detune.value = (Math.random() - 0.5) * 6;
      const strength = context.createGain();
      strength.gain.value = (gain * 0.12) / multiple;
      voice.connect(strength).connect(tone);
      voice.start(now);
      voice.stop(now + CHORD_DECAY + 0.1);
      sources.push(voice);
    }
  }
  return {
    stop: () => {
      const end = context.currentTime;
      level.gain.cancelScheduledValues(end);
      level.gain.setValueAtTime(Math.max(level.gain.value, 0.001), end);
      level.gain.exponentialRampToValueAtTime(0.001, end + RELEASE);
    },
  };
};

// Recorded sounds, by name: files in sounds/, decoded once and played dry (no reverb), as recorded.
const FILES = { chime: 'sounds/chime.ogg' };
const decoded = new Map();

/** Plays a recorded sound; it is fetched and decoded the first time. */
const recording = (name) => (context) => {
  const source = context.createBufferSource();
  const level = context.createGain();
  source.connect(level).connect(context.destination);
  let stopped = false;
  if (!decoded.has(name)) {
    decoded.set(
      name,
      fetch(FILES[name])
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data)),
    );
  }
  void decoded.get(name).then((buffer) => {
    if (!stopped) {
      source.buffer = buffer;
      source.start();
    }
  });
  return {
    stop: () => {
      stopped = true;
      const end = context.currentTime;
      level.gain.setValueAtTime(level.gain.value, end);
      level.gain.linearRampToValueAtTime(0, end + RELEASE);
    },
  };
};

const SOUNDS = { choir, chord, ...Object.fromEntries(Object.keys(FILES).map((name) => [name, recording(name)])) };

/** Creates the sound engine: `scene(name)` plays a scene's sound (or nothing), stopping the previous one. */
export const createSound = () => {
  let context;
  let out;
  let playing;
  let wanted;
  let muted = false;

  const start = () => {
    if (context || muted) {
      return;
    }
    context = new AudioContext();
    const reverb = context.createConvolver();
    reverb.buffer = impulse(context, 3.5);
    out = context.createGain();
    out.gain.value = 0.8;
    const wet = context.createGain();
    wet.gain.value = 0.6;
    out.connect(context.destination);
    out.connect(reverb).connect(wet).connect(context.destination);
    play();
  };

  const play = () => {
    playing?.stop();
    playing = undefined;
    if (context && !muted && wanted && SOUNDS[wanted]) {
      playing = SOUNDS[wanted](context, out);
    }
  };

  // The first gesture unlocks audio; `M` toggles mute.
  const unlock = () => start();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'm' || event.key === 'M') {
      muted = !muted;
      if (muted) {
        playing?.stop();
        playing = undefined;
      } else {
        start();
        play();
      }
    } else {
      start();
    }
  });

  return {
    scene: (name) => {
      wanted = name;
      play();
    },
  };
};
