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
 * Frames are compared on a strided sample of the Y plane, counting how many samples changed materially
 * rather than averaging the change: an exact comparison finds no still stretches at all (a caret or a
 * spinner moves a few pixels every frame), while a mean over the frame is dominated by frame area and
 * reads a small moving object — a dragged chess piece — as stillness.
 *
 * Needs a full ffmpeg — the one bundled with Playwright is a stripped build with no `rawvideo` and no
 * PNG decoder, so frames cannot be fed back into it (`apt-get install ffmpeg`, or set `FFMPEG_PATH`).
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    'fps': 15,
    'max-static': 1.5,
    // Fraction of sampled pixels that must change materially. A mean-difference metric fails here: a
    // chess piece crossing two squares is ~0.7% of the frame, which averages down to noise, and the
    // drags were being trimmed as if they were still.
    'threshold': 0.002,
    'delta': 12,
    'bitrate': '1400k',
    'sample': 8,
    // A still stretch that begins just after a caption went up is the one the viewer has to read, so
    // it gets its own, longer cap. Without this the hold budget is spread evenly over every pause and
    // the result is long without being readable.
    'caption-hold': 2.5,
    // Chapters shorter than this are not navigable and some players drop them outright.
    'min-chapter': 0.6,
  };
  // Valueless flags (`--report`) are consumed one at a time; a fixed stride of two would swallow the
  // next flag as this one's value and then unset it.
  for (let index = 0; index < args.length; index++) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = /^[\d.]+$/.test(value) ? Number(value) : value;
    index++;
  }
  return options;
};

/** The viewer is a local file, but caption text is arbitrary and lands in markup. */
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

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

const { width, height, seconds } = await probe(options.in).catch((error) => {
  console.error(`cannot read ${options.in}: ${error.message.split('\n')[0]}`);
  process.exit(1);
});

/**
 * Caption times as the driver recorded them, in source frames. `timeline.json` is written by
 * `driver.mjs` on `stop`; without it every pause gets the plain `--max-static` cap.
 */
const captions = (() => {
  const file = options.timeline ?? path.join(path.dirname(options.in), 'timeline.json');
  if (!existsSync(file)) {
    return [];
  }
  const { steps = [] } = JSON.parse(readFileSync(file, 'utf8'));
  return steps.map((step) => ({ ...step, frame: Math.round((step.ms / 1000) * options.fps) }));
})();
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
  let changed = 0;
  for (const index of samples) {
    if (Math.abs(frame[index] - previous[index]) > options.delta) {
      changed++;
    }
  }
  return changed / samples.length > options.threshold;
};

const decodeArgs = [
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
];

// `--report` answers "where did the time go" without spending an encode: still runs long enough to be
// capped are what a lower `--max-static` buys, and motion is the floor the trim can never go below.
if (options.report) {
  const decoder = spawn(FFMPEG, decodeArgs);
  // Registered at spawn, not after the loop: `once` on a process that has already closed never
  // resolves, so a late listener turns an ffmpeg crash into a hang.
  const decoderClosed = once(decoder, 'close');
  decoder.stderr.pipe(process.stderr);
  let pending = Buffer.alloc(0);
  let previous;
  let run = 0;
  let frames = 0;
  let motion = 0;
  // Each run carries where it began, because a run that starts inside a caption's reading window is
  // priced at `--caption-hold`, not at the cap being swept. Ignoring that made the estimate read ~10s
  // under the truth on a 9-caption demo.
  const runs = [];
  let runStart = 0;
  for await (const chunk of decoder.stdout) {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (pending.length >= frameBytes) {
      const frame = pending.subarray(0, frameBytes);
      pending = pending.subarray(frameBytes);
      frames++;
      if (!previous || moved(frame, previous)) {
        if (run) {
          runs.push({ length: run, start: runStart });
        }
        run = 0;
        runStart = frames;
        motion++;
      } else {
        run++;
      }
      previous = Buffer.from(frame);
    }
  }
  if (run) {
    runs.push({ length: run, start: runStart });
  }
  const [decoderStatus] = await decoderClosed;
  if (decoderStatus !== 0) {
    console.error(`ffmpeg decode failed (exit ${decoderStatus}) — statistics would be partial`);
    process.exit(1);
  }

  const seconds = (count) => +(count / options.fps).toFixed(1);
  const captionHold = Math.max(1, Math.round(options['caption-hold'] * options.fps));
  const captionFrames = new Set();
  for (const caption of captions) {
    for (let offset = 0; offset <= captionHold; offset++) {
      captionFrames.add(caption.frame + offset);
    }
  }
  const capped = (cap) =>
    runs.reduce(
      (total, { length, start }) =>
        total + Math.min(length, captionFrames.has(start) ? captionHold : cap * options.fps),
      0,
    );
  console.log(
    JSON.stringify(
      {
        frames,
        motionFrames: motion,
        motionSeconds: seconds(motion),
        stillRuns: runs.length,
        stillSeconds: seconds(frames - motion),
        longestStillRun: seconds(Math.max(0, ...runs.map((entry) => entry.length))),
        captions: captions.length,
        captionHold: `${options['caption-hold']}s`,
        // What each candidate `--max-static` would leave, motion and caption holds included: the still
        // runs are the only part a cap can shrink, and there are enough of them that it dominates.
        atCap: Object.fromEntries(
          [0.3, 0.5, 0.8, 1.0, 1.5, 2.0].map((cap) => [`${cap}s`, seconds(motion + capped(cap))]),
        ),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const decoder = spawn(FFMPEG, decodeArgs);

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

// Both registered before any awaiting, for the reason above.
const decoderClosed = once(decoder, 'close');
const encoderClosed = once(encoder, 'close');

decoder.stderr.pipe(process.stderr);
encoder.stderr.pipe(process.stderr);

let pending = Buffer.alloc(0);
let previous;
let staticRun = 0;
let read = 0;
let kept = 0;
let longestRun = 0;

const captionHoldFrames = Math.max(1, Math.round(options['caption-hold'] * options.fps));
/** Frames from a caption onwards during which a pause is worth holding, keyed by source frame. */
const readingWindow = new Set();
for (const caption of captions) {
  for (let offset = 0; offset <= captionHoldFrames; offset++) {
    readingWindow.add(caption.frame + offset);
  }
}

// Source frame -> output frame, so the caption times can be remapped onto the trimmed timeline.
const outputFrameOf = new Map();

for await (const chunk of decoder.stdout) {
  pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
  while (pending.length >= frameBytes) {
    const frame = pending.subarray(0, frameBytes);
    pending = pending.subarray(frameBytes);
    const index = read++;

    staticRun = !previous || moved(frame, previous) ? 0 : staticRun + 1;
    longestRun = Math.max(longestRun, staticRun);

    const cap = readingWindow.has(index) ? captionHoldFrames : holdFrames;
    // Inclusive: `--report` prices a run at `min(length, cap)`, and an exclusive test would keep one
    // frame fewer than it promised, so the estimate could never be trusted for tuning.
    if (staticRun <= cap) {
      if (!encoder.stdin.write(frame)) {
        await once(encoder.stdin, 'drain');
      }
      outputFrameOf.set(index, kept);
      kept++;
    }
    // Copied because `frame` is a view into `pending`, which the next chunk replaces.
    previous = Buffer.from(frame);
  }
}

encoder.stdin.end();
const [encoderStatus] = await encoderClosed;
const [decodeStatus] = await decoderClosed;
if (decodeStatus !== 0 || encoderStatus !== 0) {
  console.error(`ffmpeg failed (decode ${decodeStatus}, encode ${encoderStatus}) — output is unusable`);
  process.exit(1);
}

/**
 * Time-range annotations, so the steps survive outside the burned-in banner: Matroska chapters (which
 * `.webm` does carry — verified by reading them back) and an embedded WebVTT track, which is part of
 * the WebM spec. A caption's source frame may itself have been dropped, so the remap walks forward to
 * the next surviving frame.
 */
const annotate = async () => {
  const at = (sourceFrame) => {
    for (let frame = sourceFrame; frame < read; frame++) {
      const output = outputFrameOf.get(frame);
      if (output !== undefined) {
        return output / options.fps;
      }
    }
    return kept / options.fps;
  };

  // Two captions issued back to back describe the same instant — the earlier one was never really on
  // screen — and would otherwise become a zero-length chapter that players discard silently. The later
  // one wins: it describes what the viewer is about to see.
  const marks = captions
    .map((caption) => ({ ...caption, start: at(caption.frame) }))
    .filter((mark, index, all) => {
      const next = all[index + 1];
      return !next || next.start - mark.start >= options['min-chapter'];
    });
  if (!marks.length) {
    return undefined;
  }

  const clock = (value) => {
    const hours = String(Math.floor(value / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
    const secs = (value % 60).toFixed(3).padStart(6, '0');
    return `${hours}:${minutes}:${secs}`;
  };

  const end = kept / options.fps;
  const metadata = [';FFMETADATA1'];
  const vtt = ['WEBVTT', ''];
  marks.forEach((mark, index) => {
    const stop = index + 1 < marks.length ? marks[index + 1].start : end;
    metadata.push(
      '[CHAPTER]',
      'TIMEBASE=1/1000',
      `START=${Math.round(mark.start * 1000)}`,
      `END=${Math.round(stop * 1000)}`,
      // Chapter titles are a single line; the subtitle rides in the VTT cue instead.
      `title=${mark.text.replace(/\n/g, ' ')}`,
    );
    vtt.push(
      `${clock(mark.start)} --> ${clock(stop)}`,
      mark.subtitle ? `${mark.text}\n${mark.subtitle}` : mark.text,
      '',
    );
  });

  const base = output.replace(/\.webm$/, '');
  const metadataFile = `${base}.ffmetadata`;
  const vttFile = `${base}.vtt`;
  writeFileSync(metadataFile, metadata.join('\n'));
  writeFileSync(vttFile, vtt.join('\n'));

  const annotated = `${base}.annotated.webm`;

  // A viewer page, because browsers implement neither half of what was just muxed in: there is no
  // chapter UI for Matroska in any browser, and `<video>` populates textTracks only from `<track>`
  // elements, never from an in-container WebVTT track. The steps are only clickable if a page says so.
  const viewer = `${base}.html`;
  writeFileSync(
    viewer,
    `<!doctype html>
<meta charset="utf-8">
<title>${escapeHtml(path.basename(base))}</title>
<style>
  body { margin: 0; background: #111; color: #eee; font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; display: flex; gap: 16px; padding: 16px; align-items: flex-start; flex-wrap: wrap; }
  video { flex: 3 1 480px; min-width: 0; max-width: 100%; background: #000; }
  ol { flex: 1 1 260px; max-height: 90vh; overflow-y: auto; list-style: none; margin: 0; padding: 0; }
  li { padding: 8px 10px; border-radius: 6px; cursor: pointer; }
  li:hover { background: #222; }
  li.now { background: #2d4a7c; }
  small { display: block; opacity: .6; }
  code { opacity: .5; font-size: 12px; }
</style>
<video id="v" controls src="${escapeHtml(encodeURIComponent(path.basename(annotated)))}">
  <track kind="chapters" srclang="en" src="${escapeHtml(encodeURIComponent(path.basename(vttFile)))}" default>
</video>
<ol id="steps">${marks
      .map(
        (mark, index) =>
          `<li data-at="${mark.start.toFixed(3)}"><code>${clock(mark.start).slice(3, 8)}</code> ${escapeHtml(
            mark.text,
          )}${mark.subtitle ? `<small>${escapeHtml(mark.subtitle)}</small>` : ''}</li>`,
      )
      .join('\n')}</ol>
<script>
  const video = document.getElementById('v');
  const items = [...document.querySelectorAll('#steps li')];
  items.forEach((item) => item.addEventListener('click', () => { video.currentTime = Number(item.dataset.at); video.play(); }));
  video.addEventListener('timeupdate', () => {
    const active = items.filter((item) => Number(item.dataset.at) <= video.currentTime).pop();
    items.forEach((item) => item.classList.toggle('now', item === active));
  });
</script>
`,
  );

  const mux = spawn(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    output,
    '-i',
    metadataFile,
    '-i',
    vttFile,
    '-map_metadata',
    '1',
    '-map',
    '0:v',
    '-map',
    '2',
    '-c:v',
    'copy',
    '-c:s',
    'webvtt',
    '-y',
    annotated,
  ]);
  mux.stderr.pipe(process.stderr);
  const [code] = await once(mux, 'close');
  return code === 0 ? { video: annotated, vtt: vttFile, viewer, chapters: marks.length } : undefined;
};

const annotated = await annotate();

const before = seconds ?? read / options.fps;
const after = kept / options.fps;
console.log(
  JSON.stringify(
    {
      output,
      annotated,
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
