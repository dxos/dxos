//
// Copyright 2026 DXOS.org
//

import * as Tone from 'tone';

import type { Note, Patch, Score, Track } from '../types';
import { createDrum } from './sounds';

/**
 * Builds and runs a Tone.js transport for a Score.
 *
 * Architecture:
 * - The Score's tracks each get a Tone.Part holding their first sequence's notes.
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

const createSynthVoice = (patch: Patch.SynthPatch, master: Tone.Gain): Voice => {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: patch.oscillator ?? 'sine' },
    envelope: {
      attack: patch.envelope?.attack ?? 0.01,
      decay: patch.envelope?.decay ?? 0.1,
      sustain: patch.envelope?.sustain ?? 0.6,
      release: patch.envelope?.release ?? 0.2,
    },
  });
  const gain = new Tone.Gain(patch.gain ?? 0.2).connect(master);
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

const createDrumVoice = (patch: Patch.DrumPatch, master: Tone.Gain): Voice => {
  // createDrum currently routes the drum's gain to Tone.Destination internally;
  // bring it back into our master bus via a no-op pass-through gain so the
  // analyzer tap sees drum hits too.
  const drum = createDrum(patch.drum, { gain: patch.gain, destination: master });
  return {
    dispose: drum.dispose,
    trigger: (time, _pitch, _duration, velocity) => drum.trigger(time, velocity),
  };
};

const createSampleVoice = (patch: Patch.SamplePatch, master: Tone.Gain): Voice => {
  const sampler = new Tone.Sampler({
    urls: { [Tone.Frequency(patch.basePitch ?? 60, 'midi').toNote()]: patch.sampleUrl },
  });
  const gain = new Tone.Gain(patch.gain ?? 0.6).connect(master);
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

const createVoiceForPatch = (patch: AnyPatch, master: Tone.Gain): Voice => {
  switch (patch.kind) {
    case 'synth':
      return createSynthVoice(patch, master);
    case 'drum':
      return createDrumVoice(patch, master);
    case 'sample':
      return createSampleVoice(patch, master);
  }
};

type TrackVoices = {
  patches: AnyPatch[];
  voices: Map<AnyPatch, Voice>;
  fallback: Voice;
};

const buildTrackVoices = (track: Track.Track, master: Tone.Gain): TrackVoices => {
  const patches = Array.from(track.patches ?? []) as AnyPatch[];
  const voices = new Map<AnyPatch, Voice>();
  for (const patch of patches) {
    voices.set(patch, createVoiceForPatch(patch, master));
  }
  const fallbackPatch: Patch.SynthPatch = {
    kind: 'synth',
    minPitch: track.minPitch ?? 21,
    maxPitch: track.maxPitch ?? 108,
    oscillator: 'sine',
  };
  return { patches, voices, fallback: createVoiceForPatch(fallbackPatch, master) };
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

type NoteEvent = { time: number; pitch: number; duration: number; velocity: number };

type TrackData = {
  trackId: string;
  track: Track.Track;
  voices: TrackVoices;
  events: NoteEvent[];
};

/**
 * Builds and runs a Tone.js transport for a Score.
 * Call `load` to (re)build voices/events from a new Score, then `play()` / `stop()`.
 *
 * Tone.js state-machine note: `Tone.Part` instances cannot be reliably
 * restarted after `part.stop()` or after `Transport.stop()` (which internally
 * stops all synced sources). To guarantee clean playback on every play/stop
 * cycle, Parts are created fresh in `play()` and disposed in `stop()`. Voices
 * (synths, gains) are heavier and are reused across play cycles — they are
 * only rebuilt when `load()` is called with a new Score.
 */
export class ScorePlayer {
  #tracks: TrackData[] = [];
  #activeParts: Tone.Part<NoteEvent>[] = [];
  #master?: Tone.Gain;
  #started = false;
  #loopBeats = 16;
  #loopStartBeats = 0;
  #loopEndBeats = 0;

  /**
   * Master bus output as a raw `AudioNode`, suitable for an `Oscilloscope`
   * (or any other `AnalyserNode`-based meter) `source` prop. Returns
   * `undefined` until `load()` has been called.
   */
  get outputNode(): AudioNode | undefined {
    // Tone.Gain wraps a native GainNode internally; `.input` returns that
    // GainNode in Tone v15. Casting through `unknown` since Tone's typing
    // exposes it as an InputNode (Tone | AudioNode union).
    return this.#master ? ((this.#master as unknown as { input: AudioNode }).input ?? undefined) : undefined;
  }

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  /**
   * Rebuild voices and note-event tables from the given Score. Disposes any
   * previously loaded tracks. The transport is stopped if running; call
   * `play()` afterwards.
   */
  load(score: Score.Score): void {
    this.dispose();
    this.setTempo(score.tempo);

    // Master bus: every voice connects here, and the master connects to the
    // speakers. This gives us a single tap point for the oscilloscope.
    this.#master = new Tone.Gain(1).toDestination();

    const trackById = new Map(score.tracks.map((track) => [track.id, track]));
    const transport = Tone.getTransport();

    let maxLength = 0;
    for (const sequence of score.sequences) {
      const track = trackById.get(sequence.trackId);
      if (!track || track.muted) {
        continue;
      }
      maxLength = Math.max(maxLength, sequence.length);
      const voices = buildTrackVoices(track, this.#master);
      const events: NoteEvent[] = (sequence.notes ?? []).map((note: Note.Note) => ({
        time: beatsToSeconds(note.startTime, score.tempo),
        pitch: note.pitch,
        duration: note.duration,
        velocity: note.velocity ?? 0.8,
      }));
      this.#tracks.push({ trackId: track.id, track, voices, events });
    }

    // Resolve the score-level loop range with defaults. The loop is allowed to
    // extend past the longest sequence — extra time becomes silent tail that
    // gives loops "breathing room" or a pickup bar. We only enforce that the
    // range is non-empty and starts at or after 0.
    const fullLength = Math.max(1, maxLength);
    const requestedStart = Number.isFinite(score.loopStart) ? Math.max(0, score.loopStart as number) : 0;
    const requestedEnd = Number.isFinite(score.loopEnd) ? (score.loopEnd as number) : fullLength;
    const loopStartBeats = Math.max(0, requestedStart);
    const loopEndBeats = Math.max(loopStartBeats + 0.0625, requestedEnd);
    this.#loopStartBeats = loopStartBeats;
    this.#loopEndBeats = loopEndBeats;
    this.#loopBeats = fullLength;
    transport.loop = true;
    transport.loopStart = beatsToSeconds(loopStartBeats, score.tempo);
    transport.loopEnd = beatsToSeconds(loopEndBeats, score.tempo);
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
    // Rebuild voices and Parts on every play. Transport.stop() abruptly
    // cancels scheduled notes, which can leave PolySynth voice pools in a
    // bad state. Creating fresh PolySynth instances (via buildTrackVoices)
    // and fresh Parts matches the clean state you get after an unmount/remount.
    // The master Gain node is kept stable so the oscilloscope connection is
    // preserved across play cycles.
    this.#disposeActiveParts();
    if (this.#master) {
      for (const trackData of this.#tracks) {
        disposeTrackVoices(trackData.voices);
        trackData.voices = buildTrackVoices(trackData.track, this.#master);
      }
    }
    const transport = Tone.getTransport();
    for (const { voices, events } of this.#tracks) {
      const part = new Tone.Part<NoteEvent>((time, value) => {
        const voice = findVoice(voices, value.pitch);
        voice.trigger(time, value.pitch, value.duration, value.velocity);
      }, events);
      // Parts must NOT loop independently — the global Transport drives the
      // loop between Score.loopStart..loopEnd so every track stays phase-locked.
      part.loop = false;
      part.start(0);
      this.#activeParts.push(part);
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
    this.#disposeActiveParts();
  }

  /** True if play() has been called since the last stop()/dispose(). */
  get isPlaying(): boolean {
    return this.#started;
  }

  dispose(): void {
    this.stop();
    this.#disposeActiveParts();
    for (const entry of this.#tracks) {
      disposeTrackVoices(entry.voices);
    }
    this.#tracks = [];
    this.#master?.dispose();
    this.#master = undefined;
  }

  #disposeActiveParts(): void {
    const time = Math.max(0, Tone.now());
    for (const part of this.#activeParts) {
      try {
        part.stop(time);
      } catch {
        // ignore
      }
      part.dispose();
    }
    this.#activeParts = [];
  }
}
