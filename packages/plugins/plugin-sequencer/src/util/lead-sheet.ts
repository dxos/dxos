//
// Copyright 2026 DXOS.org
//

// Lead-sheet style import/export.
//
// Document format
// ---------------
//
//   [<index>:<name>]
//   <position> <event> [<event> ...]
//   <position> <event> [<event> ...]
//
//   [<index>:<name>]
//   <position> <event> ...
//
// Section headers (`[1:Piano]`) switch the active track. The index is 1-based;
// the name is free-form text.
//
// Each note line is one or more `<position> <event>+` groups, separated by
// whitespace. Positions look like `bar.beat[.frac]` (1-indexed); each event
// after a position is triggered at that beat (forming a chord when there's
// more than one). A second position on the same line opens a new group:
//
//   1.1 F#5/4   1.2 A5/4   1.3 C#6/2
//
// is equivalent to three separate single-position lines.
//
// Event syntax:
//
//   <pitch>/<denom>   pitched note, e.g. `F5/8` (F5 eighth note), `Ab3/16`
//   <pitch>           pitched note with default duration (`defaultDuration`)
//   <drum>            drum hit, e.g. `Kick`, `Snare`, `Hat`
//   <drum>/<denom>    drum hit with explicit duration
//
// Pitch notation: scientific — note (`C..B`) + optional accidental (`#`/`b`)
// + octave (`-1..9`). Middle C = C4 = MIDI 60.
//
// Duration denominator `n`: the note occupies 1/n of a whole note (so
// 4 = quarter, 8 = eighth, 16 = sixteenth, 2 = half, 1 = whole). Whole-note
// equivalent in beats = `(1/n) * 4`.
//
// Lines starting with `#` and blank lines are ignored.

import type { Note } from '../types/Note';

export type LeadSheetOptions = {
  /** Beats per bar (defaults to 4 for 4/4). */
  beatsPerBar?: number;
  /** Default beats for events written without a `/denom` suffix. */
  defaultDurationBeats?: number;
};

export type LeadSheetTrack = {
  /** 1-based index from the section header. */
  index: number;
  name: string;
  /** Set to 'drums' when the track contained any drum-name events. */
  instrument?: string;
  notes: Note[];
  /** Implied sequence length (next bar past last note). */
  length: number;
};

export type LeadSheetDocument = {
  tracks: LeadSheetTrack[];
};

const PITCH_TO_OFFSET: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const OFFSET_TO_PITCH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Aliases (lowercase) → MIDI pitch. */
const DRUM_ALIASES: Record<string, number> = {
  kick: 36,
  bass: 36,
  bd: 36,
  snare: 38,
  sd: 38,
  hat: 42,
  hh: 42,
  closedhat: 42,
  openhat: 46,
  oh: 46,
  crash: 49,
  ride: 51,
  clap: 39,
  tomlow: 41,
  tomlo: 41,
  tommid: 47,
  tomhi: 50,
};

/** MIDI → canonical drum name used by the formatter. */
const DRUM_CANONICAL: Record<number, string> = {
  36: 'Kick',
  38: 'Snare',
  39: 'Clap',
  41: 'TomLo',
  42: 'Hat',
  46: 'OpenHat',
  47: 'TomMid',
  49: 'Crash',
  50: 'TomHi',
  51: 'Ride',
};

const PITCH_RE = /^([A-Ga-g])([#b]?)(-?\d+)$/;

export const parsePitch = (input: string): number => {
  const match = PITCH_RE.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid pitch: ${input}`);
  }
  const [, letter, accidental, octaveStr] = match;
  const base = PITCH_TO_OFFSET[letter.toUpperCase()];
  const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const octave = Number(octaveStr);
  const pitch = (octave + 1) * 12 + base + accidentalOffset;
  if (pitch < 0 || pitch > 127) {
    throw new Error(`Pitch out of MIDI range: ${input}`);
  }
  return pitch;
};

export const formatPitch = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  const name = OFFSET_TO_PITCH[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
};

export const parsePosition = (input: string, beatsPerBar = 4): number => {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid position: ${input}`);
  }
  const bar = Number(match[1]);
  const beat = Number(match[2]);
  // Third segment reads as `0.<digits>` so `1.1.5` = beat 1 + 0.5.
  const frac = match[3] !== undefined ? Number(`0.${match[3]}`) : 0;
  if (bar < 1 || beat < 1) {
    throw new Error(`Invalid position (must be 1-indexed): ${input}`);
  }
  return (bar - 1) * beatsPerBar + (beat - 1) + frac;
};

export const formatPosition = (beats: number, beatsPerBar = 4): string => {
  const bar = Math.floor(beats / beatsPerBar) + 1;
  const beatWithinBar = beats - (bar - 1) * beatsPerBar;
  const beat = Math.floor(beatWithinBar) + 1;
  const frac = beatWithinBar - Math.floor(beatWithinBar);
  if (frac < 1e-9) {
    return `${bar}.${beat}`;
  }
  const digits = frac.toString().slice(2);
  return `${bar}.${beat}.${digits}`;
};

/** Convert `1/n` denominator to beats (whole note = 4 beats). */
const denominatorToBeats = (denom: number): number => {
  if (denom <= 0) {
    throw new Error(`Invalid duration denominator: ${denom}`);
  }
  return 4 / denom;
};

const beatsToDenominator = (beats: number): number | null => {
  if (beats <= 0) {
    return null;
  }
  for (const denom of [1, 2, 4, 8, 16, 32, 64]) {
    if (Math.abs(beats * denom - 4) < 1e-9) {
      return denom;
    }
  }
  return null;
};

const lookupDrum = (token: string): number | undefined => DRUM_ALIASES[token.toLowerCase()];

type Event = { pitch: number; duration: number; isDrum: boolean };

const parseEvent = (token: string, defaultDurationBeats: number): Event => {
  const slash = token.indexOf('/');
  if (slash < 0) {
    // No `/denom`: try pitch-with-default first, then drum-name.
    if (PITCH_RE.test(token)) {
      return { pitch: parsePitch(token), duration: defaultDurationBeats, isDrum: false };
    }
    const drum = lookupDrum(token);
    if (drum !== undefined) {
      return { pitch: drum, duration: defaultDurationBeats, isDrum: true };
    }
    throw new Error(`Unrecognized event token: ${token}`);
  }
  const head = token.slice(0, slash);
  const tail = token.slice(slash + 1);
  const denom = Number(tail);
  if (!Number.isFinite(denom)) {
    throw new Error(`Invalid duration in token: ${token}`);
  }
  const duration = denominatorToBeats(denom);
  if (PITCH_RE.test(head)) {
    return { pitch: parsePitch(head), duration, isDrum: false };
  }
  const drum = lookupDrum(head);
  if (drum !== undefined) {
    return { pitch: drum, duration, isDrum: true };
  }
  throw new Error(`Unrecognized event token: ${token}`);
};

const sectionHeaderRe = /^\[(\d+):([^\]]+)\]\s*$/;

// A position is `<bar>.<beat>[.<frac>]` where each segment is digits. This is
// distinct from any event token (pitches always start with a letter; drums are
// alphabetic). Used by the line parser to find new beat groups within a line.
const positionTokenRe = /^\d+\.\d+(?:\.\d+)?$/;

const stripTrailingComment = (line: string): string => line.replace(/\s+#.*$/, '');

/**
 * Parse a lead-sheet document into one or more LeadSheetTracks. The document
 * may contain section headers (`[index:name]`); content before the first header
 * is assigned to an implicit track at index 1 named `Track 1`.
 */
/** Coerce a user-supplied beatsPerBar to a positive finite integer; fall back to 4. */
const normalizeBeatsPerBar = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value) || value < 1) {
    return 4;
  }
  return Math.floor(value);
};

export const parseLeadSheet = (input: string, options: LeadSheetOptions = {}): LeadSheetDocument => {
  const beatsPerBar = normalizeBeatsPerBar(options.beatsPerBar);
  const defaultDuration = options.defaultDurationBeats ?? 0.25; // 1/16 default for unsuffixed events.

  type Builder = LeadSheetTrack & { lastEnd: number; sawDrum: boolean };
  const tracks: Builder[] = [];
  let current: Builder | null = null;

  const ensureCurrent = (): Builder => {
    if (current) {
      return current;
    }
    const fresh: Builder = { index: 1, name: 'Track 1', notes: [], length: 0, lastEnd: 0, sawDrum: false };
    tracks.push(fresh);
    current = fresh;
    return fresh;
  };

  const lines = input.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = stripTrailingComment(rawLine).trim();
    if (!line || line.startsWith('#')) {
      return;
    }
    const header = sectionHeaderRe.exec(line);
    if (header) {
      const trackIndex = Number(header[1]);
      const name = header[2].trim();
      current = { index: trackIndex, name, notes: [], length: 0, lastEnd: 0, sawDrum: false };
      tracks.push(current);
      return;
    }
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) {
      throw new Error(`Line ${index + 1}: expected position + at least one event, got "${rawLine}"`);
    }
    // A line is a sequence of `<position> <event>+` groups — every position
    // token (matching positionTokenRe) starts a new group whose events apply
    // at that beat. This lets a single line carry several beats, e.g.
    //   1.1 F#5/4   1.2 A5/4   1.3 C#6/2
    // The first token must be a position; subsequent positions reset the
    // active beat for the events that follow.
    if (!positionTokenRe.test(tokens[0])) {
      throw new Error(`Line ${index + 1}: expected position to lead, got "${tokens[0]}"`);
    }
    const track = ensureCurrent();
    let startTime = 0;
    let groupHadEvent = false;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (positionTokenRe.test(token)) {
        if (i > 0 && !groupHadEvent) {
          throw new Error(`Line ${index + 1}: position "${tokens[i - 1]}" had no events`);
        }
        startTime = parsePosition(token, beatsPerBar);
        groupHadEvent = false;
        continue;
      }
      const event = parseEvent(token, defaultDuration);
      track.notes.push({ pitch: event.pitch, startTime, duration: event.duration });
      track.lastEnd = Math.max(track.lastEnd, startTime + event.duration);
      track.sawDrum = track.sawDrum || event.isDrum;
      groupHadEvent = true;
    }
    if (!groupHadEvent) {
      throw new Error(`Line ${index + 1}: position "${tokens[tokens.length - 1]}" had no events`);
    }
  });

  return {
    tracks: tracks.map(({ lastEnd, sawDrum, ...rest }) => ({
      ...rest,
      instrument: sawDrum ? 'drums' : rest.instrument,
      length: Math.max(beatsPerBar, Math.ceil(lastEnd / beatsPerBar) * beatsPerBar),
    })),
  };
};

const formatEvent = (note: Note, asDrum: boolean): string => {
  const denom = beatsToDenominator(note.duration);
  // Suffix is always a DENOMINATOR (whole-note over n). When the duration doesn't
  // map cleanly onto a power-of-two denom, emit the literal `4 / duration` so
  // `parseEvent`'s `duration = 4 / denom` formula round-trips.
  const fallbackDenom = note.duration > 0 ? (4 / note.duration).toFixed(4) : '0';
  if (asDrum) {
    const name = DRUM_CANONICAL[note.pitch] ?? formatPitch(note.pitch);
    return denom !== null ? `${name}/${denom}` : `${name}/${fallbackDenom}`;
  }
  const pitch = formatPitch(note.pitch);
  return denom !== null ? `${pitch}/${denom}` : `${pitch}/${fallbackDenom}`;
};

/**
 * Format a LeadSheetDocument back into the text form. Tracks emit in their
 * given order; notes are grouped by startTime so chords land on one line.
 */
export const formatLeadSheet = (document: LeadSheetDocument, options: LeadSheetOptions = {}): string => {
  const beatsPerBar = normalizeBeatsPerBar(options.beatsPerBar);
  const blocks: string[] = [];
  for (const track of document.tracks) {
    const lines: string[] = [`[${track.index}:${track.name}]`];
    const asDrum = track.instrument === 'drums';
    // Group notes by startTime preserving sorted order.
    const grouped = new Map<number, Note[]>();
    for (const note of [...track.notes].sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch)) {
      const list = grouped.get(note.startTime);
      if (list) {
        list.push(note);
      } else {
        grouped.set(note.startTime, [note]);
      }
    }
    for (const [startTime, notes] of grouped) {
      const position = formatPosition(startTime, beatsPerBar);
      const events = notes.map((note) => formatEvent(note, asDrum)).join(' ');
      lines.push(`${position} ${events}`);
    }
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
};
