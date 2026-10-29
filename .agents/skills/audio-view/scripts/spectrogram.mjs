#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Renders an audio file as a PNG an LLM can read: a time axis in seconds, the waveform, a mel spectrogram (0-8 kHz,
// low frequencies at the bottom), the speech/silence strip, and - with --words - numbered word spans whose legend is
// printed to stdout.
//
// Usage: node spectrogram.mjs <file> [-o out.png] [--words words.json|timeline.jsonl] [--from s] [--to s] [--width px]

import { readFileSync } from 'node:fs';

import { SAMPLE_RATE, analyze, formatTime, loadAudio, parseArgs, toDb } from './lib/audio.mjs';
import { Canvas, heat } from './lib/png.mjs';

const { positional, flags } = parseArgs(process.argv.slice(2));
const file = positional[0];
if (!file) {
  console.error('Usage: node spectrogram.mjs <file> [-o out.png] [--words file] [--from s] [--to s] [--width px]');
  process.exit(1);
}

const all = loadAudio(file);
const analysis = analyze(all);
const from = Math.max(0, Number(flags.from ?? 0));
const to = Math.min(analysis.duration, Number(flags.to ?? analysis.duration));
const samples = all.subarray(Math.floor(from * SAMPLE_RATE), Math.floor(to * SAMPLE_RATE));
const duration = samples.length / SAMPLE_RATE;

// 10 ms columns read well up to a couple of minutes; longer spans are squeezed into the width.
const WIDTH = Number(flags.width ?? Math.min(2400, Math.max(600, Math.round(duration * 100) + 60)));
const LEFT = 50;
const PLOT = WIDTH - LEFT - 10;
const AXIS = 16;
const WAVE = 60;
const SPEC = 256;
const STRIP = 10;
const WORDS = 60;
const HEIGHT = AXIS + WAVE + SPEC + STRIP + WORDS + 8;
const xOf = (time) => LEFT + ((time - from) / duration) * PLOT;

const canvas = new Canvas(WIDTH, HEIGHT, [18, 18, 20]);
const GRID = [60, 60, 66];
const LABEL = [190, 190, 190];

// Time axis: a tick per second, labelled every 1, 2, 5 or 10 s depending on density.
const labelEvery = [1, 2, 5, 10, 30, 60].find((step) => (PLOT / duration) * step >= 40) ?? 60;
for (let second = Math.ceil(from); second <= to; second++) {
  const x = xOf(second);
  canvas.fill(x, AXIS, 1, WAVE + SPEC + STRIP, GRID);
  if (second % labelEvery === 0) {
    canvas.text(x + 2, 3, `${second}s`, LABEL);
  }
}

// Waveform: per-column peak.
const waveTop = AXIS;
const perColumn = samples.length / PLOT;
for (let column = 0; column < PLOT; column++) {
  let peak = 0;
  for (let index = Math.floor(column * perColumn); index < Math.floor((column + 1) * perColumn); index++) {
    peak = Math.max(peak, Math.abs(samples[index] ?? 0));
  }
  const height = Math.max(1, peak * (WAVE - 4));
  canvas.fill(LEFT + column, waveTop + (WAVE - height) / 2, 1, height, [93, 202, 165]);
}

// Mel spectrogram: 25 ms Hann windows every 10 ms, 512-point FFT, mel bands mapped to rows.
const FFT = 512;
const WINDOW = 400;
const HOP = 160;
const hann = Float32Array.from({ length: WINDOW }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / WINDOW));
const columns = Math.max(1, Math.floor((samples.length - WINDOW) / HOP) + 1);
const mel = (hz) => 2595 * Math.log10(1 + hz / 700);
const maxMel = mel(SAMPLE_RATE / 2);
const binOfRow = Array.from({ length: SPEC }, (_, row) => {
  const hz = 700 * (10 ** (((1 - row / SPEC) * maxMel) / 2595) - 1);
  return Math.min(FFT / 2 - 1, Math.round((hz / (SAMPLE_RATE / 2)) * (FFT / 2)));
});
const spectra = [];
let loudest = -Infinity;
const real = new Float64Array(FFT);
const imag = new Float64Array(FFT);
for (let column = 0; column < columns; column++) {
  real.fill(0);
  imag.fill(0);
  for (let index = 0; index < WINDOW; index++) {
    real[index] = (samples[column * HOP + index] ?? 0) * hann[index];
  }
  fft(real, imag);
  const magnitudes = new Float32Array(FFT / 2);
  for (let bin = 0; bin < FFT / 2; bin++) {
    magnitudes[bin] = toDb(Math.hypot(real[bin], imag[bin]));
    loudest = Math.max(loudest, magnitudes[bin]);
  }
  spectra.push(magnitudes);
}
const specTop = AXIS + WAVE;
const RANGE_DB = 80;
for (let x = 0; x < PLOT; x++) {
  const spectrum = spectra[Math.min(spectra.length - 1, Math.floor((x / PLOT) * spectra.length))];
  for (let row = 0; row < SPEC; row++) {
    const value = (spectrum[binOfRow[row]] - (loudest - RANGE_DB)) / RANGE_DB;
    canvas.set(LEFT + x, specTop + row, heat(value));
  }
}
for (const khz of [1, 2, 4, 8]) {
  const row = SPEC * (1 - mel(Math.min(khz * 1000, SAMPLE_RATE / 2 - 1)) / maxMel);
  canvas.fill(LEFT - 4, specTop + row, 4, 1, LABEL);
  canvas.text(2, specTop + Math.max(0, row - 5), `${khz}kHz`, LABEL, 1);
}

// Speech/silence strip.
const stripTop = specTop + SPEC;
for (const { kind, start, end } of analysis.segments) {
  if (end <= from || start >= to) {
    continue;
  }
  const left = xOf(Math.max(start, from));
  canvas.fill(
    left,
    stripTop + 2,
    xOf(Math.min(end, to)) - left,
    STRIP - 3,
    kind === 'speech' ? [93, 202, 165] : [70, 70, 76],
  );
}

// Words: numbered spans, alternating rows so neighbours do not overlap, with the legend on stdout.
const words = flags.words ? loadWords(flags.words).filter(({ start, end }) => end > from && start < to) : [];
const wordsTop = stripTop + STRIP + 4;
const COLORS = [
  [255, 200, 87],
  [127, 119, 221],
  [237, 147, 177],
  [133, 183, 235],
];
words.forEach(({ start, end }, index) => {
  const color = COLORS[index % COLORS.length];
  const left = xOf(Math.max(start, from));
  const width = Math.max(2, xOf(Math.min(end, to)) - left);
  const lane = index % 3;
  canvas.fill(left, specTop, 1, SPEC, color);
  canvas.fill(left, wordsTop + lane * 18, width, 4, color);
  canvas.text(left + 1, wordsTop + lane * 18 + 6, index + 1, color, 2);
});

const out = flags.out ?? file.replace(/\.[^.]+$/, '') + '.png';
canvas.save(out);
console.log(`wrote ${out} (${WIDTH}×${HEIGHT}), ${formatTime(from)}-${formatTime(to)}`);
console.log('rows: time axis · waveform · mel spectrogram (0-8 kHz, low at bottom) · speech/silence · words');
if (words.length > 0) {
  console.log('\n  #   start    end      p     word');
  words.forEach(({ word, start, end, probability }, index) =>
    console.log(
      `  ${String(index + 1).padStart(3)} ${formatTime(start).padEnd(8)} ${formatTime(end).padEnd(8)} ` +
        `${probability === undefined ? '  -  ' : probability.toFixed(2).padStart(5)} ${word}`,
    ),
  );
}

/** Words from a JSON array of `{ word, start, end }`, or the `commit` events of a whistle-replay timeline. */
function loadWords(path) {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.jsonl')) {
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .flatMap((event) => event.committed ?? []);
  }
  return JSON.parse(text);
}

/** In-place iterative radix-2 FFT. */
function fft(real, imag) {
  const size = real.length;
  for (let index = 1, swap = 0; index < size; index++) {
    let bit = size >> 1;
    for (; swap & bit; bit >>= 1) {
      swap ^= bit;
    }
    swap ^= bit;
    if (index < swap) {
      [real[index], real[swap]] = [real[swap], real[index]];
      [imag[index], imag[swap]] = [imag[swap], imag[index]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    for (let start = 0; start < size; start += length) {
      for (let offset = 0; offset < length / 2; offset++) {
        const cos = Math.cos(angle * offset);
        const sin = Math.sin(angle * offset);
        const evenIndex = start + offset;
        const oddIndex = evenIndex + length / 2;
        const oddReal = real[oddIndex] * cos - imag[oddIndex] * sin;
        const oddImag = real[oddIndex] * sin + imag[oddIndex] * cos;
        real[oddIndex] = real[evenIndex] - oddReal;
        imag[oddIndex] = imag[evenIndex] - oddImag;
        real[evenIndex] += oddReal;
        imag[evenIndex] += oddImag;
      }
    }
  }
}
