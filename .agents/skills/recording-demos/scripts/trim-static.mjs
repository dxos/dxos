//
// Copyright 2026 DXOS.org
//

/**
 * Caps every motionless stretch of a demo recording at a fixed duration.
 *
 * An agent-driven recording is mostly dead air: the browser holds one frame while the agent decides
 * the next gesture, so a 13-minute file can carry about a minute of motion. This keeps the first
 * `--max-static` seconds of each still stretch — long enough to read the screen — and drops the rest.
 *
 *   node trim-static.mjs --in demo.webm --out demo-trimmed.webm
 *
 * One ffmpeg decodes to raw frames, this script decides frame by frame, a second ffmpeg re-encodes
 * what survives. The decision is causal — a frame is dropped once the current still run has already
 * been held long enough — so it needs no lookahead and nothing is buffered but the frame in hand.
 *
 * Frames are compared on a strided sample of the Y plane with a tolerance, not by byte equality: a
 * caret, a spinner or a compression wobble changes a few pixels every frame, and an exact comparison
 * would find no still stretches at all.
 *
 * Needs a full ffmpeg — the one bundled with Playwright is a stripped build with no `rawvideo` and no
 * PNG decoder, so frames cannot be fed back into it (`apt-get install ffmpeg`, or set `FFMPEG_PATH`).
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { 'fps': 15, 'max-static': 1.5, 'threshold': 1.2, 'bitrate': '1400k', 'sample': 8 };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    options[key] = /^[\d.]+$/.test(value) ? Number(value) : value;
  }
  return options;
};

const options = parseArgs();
if (!options.in || !existsSync(options.in)) {
  console.error('usage: node trim-static.mjs --in <video> [--out <video>] [--max-static 1.5] [--fps 15]');
  process.exit(1);
}
const output = options.out ?? options.in.replace(/\.webm$/, '-trimmed.webm');

/** Geometry and duration come off ffmpeg's stderr, so the script needs no ffprobe. */
const probe = async (file) => {
  const proc = spawn(FFMPEG, ['-hide_banner', '-i', file]);
  let text = '';
  proc.stderr.on('data', (chunk) => (text += chunk));
  await once(proc, 'close');
  const size = text.match(/, (\d+)x(\d+)[ ,]/);
  const duration = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  if (!size) {
    throw new Error(`could not read frame size:\n${text.slice(-600)}`);
  }
  return {
    width: Number(size[1]),
    height: Number(size[2]),
    seconds: duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : undefined,
  };
};

const { width, height, seconds } = await probe(options.in);
const frameBytes = (width * height * 3) / 2; // yuv420p
const holdFrames = Math.max(1, Math.round(options['max-static'] * options.fps));

// A strided grid over the Y plane: enough signal to separate a still screen from a moving one, cheap
// enough to run inside the frame loop.
const samples = [];
for (let y = 0; y < height; y += options.sample) {
  for (let x = 0; x < width; x += options.sample) {
    samples.push(y * width + x);
  }
}

const moved = (frame, previous) => {
  let total = 0;
  for (const index of samples) {
    total += Math.abs(frame[index] - previous[index]);
  }
  return total / samples.length > options.threshold;
};

const decoder = spawn(FFMPEG, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-i',
  options.in,
  // A constant output rate makes frame index a clock: a screencast's frame timing is wildly variable,
  // so without this a "frame" is not a fixed slice of time and the cap would mean nothing.
  '-r',
  String(options.fps),
  '-pix_fmt',
  'yuv420p',
  '-f',
  'rawvideo',
  '-',
]);

const encoder = spawn(FFMPEG, [
  '-hide_banner',
  '-loglevel',
  'error',
  '-f',
  'rawvideo',
  '-pix_fmt',
  'yuv420p',
  '-s',
  `${width}x${height}`,
  '-framerate',
  String(options.fps),
  '-i',
  '-',
  '-c:v',
  'libvpx',
  '-b:v',
  options.bitrate,
  '-y',
  output,
]);

decoder.stderr.pipe(process.stderr);
encoder.stderr.pipe(process.stderr);

let pending = Buffer.alloc(0);
let previous;
let staticRun = 0;
let read = 0;
let kept = 0;
let longestRun = 0;

for await (const chunk of decoder.stdout) {
  pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
  while (pending.length >= frameBytes) {
    const frame = pending.subarray(0, frameBytes);
    pending = pending.subarray(frameBytes);
    read++;

    staticRun = !previous || moved(frame, previous) ? 0 : staticRun + 1;
    longestRun = Math.max(longestRun, staticRun);

    if (staticRun < holdFrames) {
      if (!encoder.stdin.write(frame)) {
        await once(encoder.stdin, 'drain');
      }
      kept++;
    }
    // Copied because `frame` is a view into `pending`, which the next chunk replaces.
    previous = Buffer.from(frame);
  }
}

encoder.stdin.end();
await once(encoder, 'close');

const before = seconds ?? read / options.fps;
const after = kept / options.fps;
console.log(
  JSON.stringify(
    {
      output,
      frames: { read, kept, dropped: read - kept },
      seconds: { before: +before.toFixed(1), after: +after.toFixed(1) },
      reduction: `${Math.round((1 - after / before) * 100)}%`,
      longestStillRun: `${(longestRun / options.fps).toFixed(1)}s`,
      cap: `${options['max-static']}s`,
    },
    null,
    2,
  ),
);
