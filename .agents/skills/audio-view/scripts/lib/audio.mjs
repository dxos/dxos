//
// Copyright 2026 DXOS.org
//

// Decoding and level analysis shared by the audio-view scripts: everything is reduced to 16 kHz mono float samples,
// the rate Whistle and most speech models consume, so times line up across every view.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const SAMPLE_RATE = 16_000;

/** Analysis frame: 20 ms. */
export const FRAME_SECONDS = 0.02;

/** Speech runs shorter than this are clicks, silences shorter than this are within a phrase. */
const MIN_SPEECH_SECONDS = 0.1;
const MIN_SILENCE_SECONDS = 0.3;

/** A frame this far above the noise floor is speech (or at least sound). */
const SPEECH_MARGIN_DB = 12;

/** ...and never quieter than this: a file of room tone alone has a floor too, and its loudest frames are not speech. */
const SPEECH_MIN_DB = -45;

/** Loads any audio file as 16 kHz mono floats: WAV natively, everything else through ffmpeg. */
export const loadAudio = (path) => {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') {
    const { samples, sampleRate } = decodeWav(bytes);
    return resample(samples, sampleRate);
  }
  try {
    const raw = execFileSync(
      'ffmpeg',
      ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', '-'],
      { maxBuffer: 1 << 30 },
    );
    return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).slice();
  } catch (error) {
    throw new Error(`Cannot decode ${path}: only WAV is read natively; other formats need ffmpeg (${error.message})`);
  }
};

/** PCM 8/16/24/32-bit or 32-bit float WAV, mixed down to mono. */
const decodeWav = (bytes) => {
  let offset = 12;
  let format;
  let data;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      format = {
        code: bytes.readUInt16LE(offset + 8),
        channels: bytes.readUInt16LE(offset + 10),
        sampleRate: bytes.readUInt32LE(offset + 12),
        bits: bytes.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      data = bytes.subarray(offset + 8, offset + 8 + size);
    }
    offset += 8 + size + (size % 2);
  }
  if (!format || !data) {
    throw new Error('Malformed WAV: missing fmt or data chunk.');
  }
  const { code, channels, sampleRate, bits } = format;
  const bytesPerSample = bits / 8;
  const frames = Math.floor(data.length / (bytesPerSample * channels));
  const read = (position) => {
    if (code === 3 && bits === 32) {
      return data.readFloatLE(position);
    }
    switch (bits) {
      case 8:
        return (data.readUInt8(position) - 128) / 128;
      case 16:
        return data.readInt16LE(position) / 0x8000;
      case 24:
        return data.readIntLE(position, 3) / 0x800000;
      case 32:
        return data.readInt32LE(position) / 0x80000000;
      default:
        throw new Error(`Unsupported WAV sample format: ${bits}-bit (format ${code}).`);
    }
  };
  const samples = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      sum += read((frame * channels + channel) * bytesPerSample);
    }
    samples[frame] = sum / channels;
  }
  return { samples, sampleRate };
};

/** Linear-interpolation resampling to 16 kHz; adequate for analysis and for a speech model's input. */
const resample = (samples, sampleRate) => {
  if (sampleRate === SAMPLE_RATE) {
    return samples;
  }
  const ratio = sampleRate / SAMPLE_RATE;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let index = 0; index < output.length; index++) {
    const position = index * ratio;
    const before = Math.floor(position);
    const after = Math.min(before + 1, samples.length - 1);
    output[index] = samples[before] + (samples[after] - samples[before]) * (position - before);
  }
  return output;
};

/** Decibels, floored at -100 so digital silence stays on a readable scale. */
export const toDb = (value) => Math.max(-100, 20 * Math.log10(value + 1e-10));

/**
 * Per-frame levels, the noise floor (a low percentile of frame levels, so it follows the room rather than a fixed
 * threshold) and the speech/silence segments derived from them.
 */
export const analyze = (samples) => {
  const frameSamples = Math.round(FRAME_SECONDS * SAMPLE_RATE);
  const frames = [];
  let clipped = 0;
  let peak = 0;
  let energy = 0;
  for (let start = 0; start + frameSamples <= samples.length; start += frameSamples) {
    let sum = 0;
    let framePeak = 0;
    for (let index = start; index < start + frameSamples; index++) {
      const value = Math.abs(samples[index]);
      sum += value * value;
      framePeak = Math.max(framePeak, value);
      if (value >= 0.999) {
        clipped++;
      }
    }
    energy += sum;
    peak = Math.max(peak, framePeak);
    frames.push({ rmsDb: toDb(Math.sqrt(sum / frameSamples)), peakDb: toDb(framePeak) });
  }

  const sorted = frames.map(({ rmsDb }) => rmsDb).sort((left, right) => left - right);
  const floorDb = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.1)] : -100;
  const thresholdDb = Math.max(floorDb + SPEECH_MARGIN_DB, SPEECH_MIN_DB);
  const segments = toSegments(
    frames.map(({ rmsDb }) => rmsDb >= thresholdDb),
    frames,
  );

  return {
    duration: samples.length / SAMPLE_RATE,
    peakDb: toDb(peak),
    rmsDb: toDb(Math.sqrt(energy / Math.max(1, samples.length))),
    floorDb,
    thresholdDb,
    clipped,
    frames,
    segments,
  };
};

/** Runs of speech and silence, with too-short runs merged into their neighbours. */
const toSegments = (speechFlags, frames) => {
  const runs = [];
  for (const [index, speech] of speechFlags.entries()) {
    const last = runs.at(-1);
    if (last && last.speech === speech) {
      last.end = index + 1;
    } else {
      runs.push({ speech, start: index, end: index + 1 });
    }
  }
  const minFrames = (seconds) => Math.round(seconds / FRAME_SECONDS);
  const merged = [];
  for (const run of runs) {
    const short = run.end - run.start < minFrames(run.speech ? MIN_SPEECH_SECONDS : MIN_SILENCE_SECONDS);
    const last = merged.at(-1);
    if (last && (short || last.speech === run.speech)) {
      last.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  // A short first run has nothing before it to merge into, so it joins the run after it.
  if (
    merged.length > 1 &&
    merged[0].end - merged[0].start < minFrames(merged[0].speech ? MIN_SPEECH_SECONDS : MIN_SILENCE_SECONDS)
  ) {
    merged[1].start = merged[0].start;
    merged.shift();
  }
  return merged.map(({ speech, start, end }) => {
    const levels = frames.slice(start, end).map(({ rmsDb }) => rmsDb);
    return {
      kind: speech ? 'speech' : 'silence',
      start: start * FRAME_SECONDS,
      end: end * FRAME_SECONDS,
      meanDb: levels.reduce((sum, level) => sum + level, 0) / Math.max(1, levels.length),
      maxDb: Math.max(...levels),
    };
  });
};

/** The segment covering `time`, if any. */
export const segmentAt = (segments, time) => segments.find(({ start, end }) => time >= start && time < end);

/** Seconds as `m:ss.s`. */
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, '0')}`;
};

/** Parses `--flag value` pairs and positionals. */
export const parseArgs = (args) => {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg.startsWith('--')) {
      const next = args[index + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[arg.slice(2)] = true;
      } else {
        flags[arg.slice(2)] = next;
        index++;
      }
    } else if (arg === '-o') {
      flags.out = args[++index];
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
};
