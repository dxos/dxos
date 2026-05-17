//
// Copyright 2026 DXOS.org
//

import * as Tone from 'tone';

import type { Note, Patch, Song, Track } from '../types';
import { createDrum } from './sounds';

/**
 * Builds and runs a Tone.js transport for a Song.
 *
 * Architecture:
 * - The Song's tracks each get a Tone.Part holding their first sequence's notes.
 * - Each Part's callback resolves the note to a patch on the track and triggers
 *   the corresponding sound generator (synth, drum, or sample).
 * - The Transport handles global tempo and starts/stops all parts together.
 *
 * Note triggering selects a Patch by walking the track's `patches` array and
 * matching the note's MIDI pitch against the patch's pitch range. If no patch
 * matches (or no patches are defined), a default sine-wave synth covering the
 * track's full range is used so a track with no explicit patches still makes sound.
 */

type AnyPatch = Patch.Patch;

type Voice = {
  dispose: () => void;
  trigger: (time: number, pitch: number, durationBeats: number, velocity: number) => void;
};

const midiToFrequency = (pitch: number): number => 440 * Math.pow(2, (pitch - 69) / 12);

const beatsToSeconds = (beats: number, bpm: number): number => (beats / bpm) * 60;

const createSynthVoice = (patch: Patch.SynthPatch): Voice => {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: patch.oscillator ?? 'sine' },
    envelope: {
      attack: patch.envelope?.attack ?? 0.01,
      decay: patch.envelope?.decay ?? 0.1,
      sustain: patch.envelope?.sustain ?? 0.6,
      release: patch.envelope?.release ?? 0.2,
    },
  });
  const gain = new Tone.Gain(patch.gain ?? 0.2).toDestination();
  synth.connect(gain);
  return {
    dispose: () => {
      synth.dispose();
      gain.dispose();
    },
    trigger: (time, pitch, durationBeats, velocity) => {
      const freq = midiToFrequency(pitch);
      const durationSec = beatsToSeconds(durationBeats, Tone.getTransport().bpm.value);
      synth.triggerAttackRelease(freq, durationSec, time, velocity);
    },
  };
};

const createDrumVoice = (patch: Patch.DrumPatch): Voice => {
  const drum = createDrum(patch.drum, { gain: patch.gain });
  return {
    dispose: drum.dispose,
    trigger: (time, _pitch, _duration, velocity) => drum.trigger(time, velocity),
  };
};

const createSampleVoice = (patch: Patch.SamplePatch): Voice => {
  const sampler = new Tone.Sampler({
    urls: { [Tone.Frequency(patch.basePitch ?? 60, 'midi').toNote()]: patch.sampleUrl },
  });
  const gain = new Tone.Gain(patch.gain ?? 0.6).toDestination();
  sampler.connect(gain);
  return {
    dispose: () => {
      sampler.dispose();
      gain.dispose();
    },
    trigger: (time, pitch, durationBeats, velocity) => {
      const durationSec = beatsToSeconds(durationBeats, Tone.getTransport().bpm.value);
      sampler.triggerAttackRelease(Tone.Frequency(pitch, 'midi').toFrequency(), durationSec, time, velocity);
    },
  };
};

const inRange = (pitch: number, min: number, max: number) => pitch >= min && pitch <= max;

const patchCovers = (patch: AnyPatch, pitch: number): boolean => {
  switch (patch.kind) {
    case 'drum':
      return patch.pitch === pitch;
    case 'synth':
    case 'sample':
      return inRange(pitch, patch.minPitch, patch.maxPitch);
  }
};

const createVoiceForPatch = (patch: AnyPatch): Voice => {
  switch (patch.kind) {
    case 'synth':
      return createSynthVoice(patch);
    case 'drum':
      return createDrumVoice(patch);
    case 'sample':
      return createSampleVoice(patch);
  }
};

type TrackVoices = {
  patches: AnyPatch[];
  voices: Map<AnyPatch, Voice>;
  fallback: Voice;
};

const buildTrackVoices = (track: Track.Track): TrackVoices => {
  const patches = Array.from(track.patches ?? []) as AnyPatch[];
  const voices = new Map<AnyPatch, Voice>();
  for (const patch of patches) {
    voices.set(patch, createVoiceForPatch(patch));
  }
  const fallbackPatch: Patch.SynthPatch = {
    kind: 'synth',
    minPitch: track.minPitch ?? 24,
    maxPitch: track.maxPitch ?? 84,
    oscillator: 'sine',
  };
  return { patches, voices, fallback: createVoiceForPatch(fallbackPatch) };
};

const findVoice = (trackVoices: TrackVoices, pitch: number): Voice => {
  for (const patch of trackVoices.patches) {
    if (patchCovers(patch, pitch)) {
      const voice = trackVoices.voices.get(patch);
      if (voice) {
        return voice;
      }
    }
  }
  return trackVoices.fallback;
};

const disposeTrackVoices = (trackVoices: TrackVoices) => {
  for (const voice of trackVoices.voices.values()) {
    voice.dispose();
  }
  trackVoices.fallback.dispose();
};

type ScheduledTrack = {
  trackId: string;
  voices: TrackVoices;
  part: Tone.Part<{ time: number; pitch: number; duration: number; velocity: number }>;
};

/**
 * Builds Tone.Parts for each Track of a Song and controls the global transport.
 * Call `load` to (re)build with a new Song, then `play()` / `stop()`.
 */
export class SongPlayer {
  #scheduled: ScheduledTrack[] = [];
  #started = false;
  #loopBeats = 16;
  #loopStartBeats = 0;
  #loopEndBeats = 0;

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  /**
   * Rebuild Tone Parts from the given Song. Disposes any previously scheduled
   * tracks. The transport is stopped if running; call `play()` afterwards.
   */
  load(song: Song.Song): void {
    this.dispose();
    this.setTempo(song.tempo);

    const trackById = new Map(song.tracks.map((track) => [track.id, track]));
    const transport = Tone.getTransport();

    let maxLength = 0;
    for (const sequence of song.sequences) {
      const track = trackById.get(sequence.trackId);
      if (!track || track.muted) {
        continue;
      }
      maxLength = Math.max(maxLength, sequence.length);
      const voices = buildTrackVoices(track);
      type Event = { time: number; pitch: number; duration: number; velocity: number };
      const events: Event[] = (sequence.notes ?? []).map((note: Note.Note) => ({
        time: beatsToSeconds(note.startTime, song.tempo),
        pitch: note.pitch,
        duration: note.duration,
        velocity: note.velocity ?? 0.8,
      }));
      const part = new Tone.Part<Event>((time, value) => {
        const voice = findVoice(voices, value.pitch);
        voice.trigger(time, value.pitch, value.duration, value.velocity);
      }, events);
      // Parts must NOT loop independently — the global Transport drives the loop
      // between Song.loopStart..loopEnd so every track stays phase-locked.
      part.loop = false;
      this.#scheduled.push({ trackId: track.id, voices, part });
    }

    // Resolve the song-level loop range with defaults + clamping.
    const fullLength = Math.max(1, maxLength);
    const requestedStart = Number.isFinite(song.loopStart) ? Math.max(0, song.loopStart as number) : 0;
    const requestedEnd = Number.isFinite(song.loopEnd) ? (song.loopEnd as number) : fullLength;
    const loopStartBeats = Math.min(requestedStart, fullLength);
    const loopEndBeats = Math.max(loopStartBeats + 0.0625, Math.min(requestedEnd, fullLength));
    this.#loopStartBeats = loopStartBeats;
    this.#loopEndBeats = loopEndBeats;
    this.#loopBeats = fullLength;
    transport.loop = true;
    transport.loopStart = beatsToSeconds(loopStartBeats, song.tempo);
    transport.loopEnd = beatsToSeconds(loopEndBeats, song.tempo);
  }

  /** Currently configured loop range in beats — `null` before `load()` runs. */
  get loopRange(): { start: number; end: number } | null {
    if (this.#loopEndBeats === 0) {
      return null;
    }
    return { start: this.#loopStartBeats, end: this.#loopEndBeats };
  }

  async play(): Promise<void> {
    await Tone.start();
    const transport = Tone.getTransport();
    for (const { part } of this.#scheduled) {
      part.start(0);
    }
    // Start the transport AT loopStart so playback always begins inside the
    // configured loop range — otherwise events at beats 0..loopStart would
    // fire once on initial play, then never again.
    transport.start('+0', transport.loopStart);
    this.#started = true;
  }

  stop(): void {
    if (!this.#started) {
      return;
    }
    this.#started = false;
    // Tone's internal `now()` can return a value just below zero (e.g.
    // -3.7e-13) when the AudioContext was only briefly started, and the
    // schedule cancel-time setter validates `value >= 0` and throws
    // RangeError. Pass an explicit clamped time and additionally swallow
    // the rare race so a stop after a transient play never bubbles up.
    const time = Math.max(0, Tone.now());
    try {
      Tone.getTransport().stop(time);
    } catch {
      /* see comment above */
    }
    for (const { part } of this.#scheduled) {
      try {
        part.stop(time);
      } catch {
        /* see comment above */
      }
    }
  }

  /** True if play() has been called since the last stop()/dispose(). */
  get isPlaying(): boolean {
    return this.#started;
  }

  dispose(): void {
    this.stop();
    for (const entry of this.#scheduled) {
      entry.part.dispose();
      disposeTrackVoices(entry.voices);
    }
    this.#scheduled = [];
  }
}
