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
 * `--intro <video>` / `--outro <video>` bookend the trimmed demo with another clip (scaled and letterboxed
 * to the demo's frame); `--voiceover steps|<cues.json>` narrates the result with HeyGen (`voiceover.mjs`);
 * `--ident` uses the DXOS ident from `tools/ident`, rendering it on first use.
 *
 * Needs a full ffmpeg — the one bundled with Playwright is a stripped build with no `rawvideo` and no
 * PNG decoder, so frames cannot be fed back into it (`apt-get install ffmpeg`, or set `FFMPEG_PATH`).
 */

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
    // An absolute floor beside the fraction: one typed character at 2x is ~10 samples, far under 0.2% of the
    // frame, so without it a typing step reads as stillness and is trimmed away.
    'min-changed': 6,
    'delta': 12,
    // Constant quality rather than a bitrate: a fixed rate that suits 1280x800 smears a 2x recording,
    // and most of an agent-paced demo is still frames that cost next to nothing at any quality.
    'crf': 30,
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
  console.error(
    'usage: node trim-static.mjs --in <video> [--out <video>] [--max-static 1.5] [--fps 15] [--mp4] [--ident | --intro <video> --outro <video>] [--voiceover steps|<cues.json>] [--voice <name>] [--intro-line <text>|off] [--upload off] [--name <name>] [--screenshot]',
  );
  process.exit(1);
}
const output = options.out ?? options.in.replace(/\.webm$/, '-trimmed.webm');

/**
 * The DXOS ident's opening title and end card, rendered by `tools/ident` into its `out/` on first use.
 */
const ident = (id) => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../tools/ident');
  const dir = path.join(root, 'out', id);
  // The clip's length is part of its name (`DXOS_SI_COMPOSER_3.5s_16x9_v01.mp4`), so find it rather than spell it.
  const find = () =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((name) => name.startsWith(`DXOS_SI_${id}_`) && name.endsWith('_16x9_v01.mp4'))
          .map((name) => path.join(dir, name))[0]
      : undefined;
  // A clip older than the ident's sources is stale: re-render it rather than bookend with an old animation.
  // Sources and the assets they render with (an installed or replaced font changes the clip too).
  const newest = Math.max(
    ...['src', 'public'].flatMap((dir) =>
      readdirSync(path.join(root, dir), { recursive: true }).map(
        (name) => statSync(path.join(root, dir, String(name))).mtimeMs,
      ),
    ),
  );
  let file = find();
  if (!file || statSync(file).mtimeMs < newest) {
    console.error(`rendering ${id} ident…`);
    const render = spawnSync('node', ['scripts/render.mjs', '--id', id, '--format', '16x9'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    file = find();
    if (render.status !== 0 || !file) {
      console.error(`could not render the ${id} ident (run \`pnpm install\` and see tools/ident/README.md)`);
      process.exit(1);
    }
  }
  return file;
};
if (options.ident) {
  // `--ident composer` opens on the Composer logo instead of the DXOS title.
  options.intro ??= ident(typeof options.ident === 'string' ? options.ident.toUpperCase() : 'OPEN');
  options.outro ??= ident('END');
}
for (const clip of [options.intro, options.outro]) {
  if (clip !== undefined && (typeof clip !== 'string' || !existsSync(clip))) {
    console.error(`no such clip: ${clip}`);
    process.exit(1);
  }
}

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
 * `--duration <min>-<max>` (default 45-60 seconds, bookends included) picks the still-frame cap instead of a
 * fixed `--max-static`: the longest cap whose result fits under the maximum, from one `--report` pass. A take
 * too short to reach the minimum even untrimmed needs more steps, which no cap can supply.
 */
const fitDuration = async () => {
  const [min, max] = String(options.duration ?? '45-60')
    .split('-')
    .map(Number);
  const bookends = (
    await Promise.all(
      [options.intro, options.outro].filter(Boolean).map((clip) => probe(clip).then((info) => info.seconds ?? 0)),
    )
  ).reduce((total, value) => total + value, 0);
  const report = spawnSync(
    process.execPath,
    [
      new URL(import.meta.url).pathname,
      ...process.argv.slice(2).filter((arg, index, all) => arg !== '--duration' && all[index - 1] !== '--duration'),
      '--report',
    ],
    { encoding: 'utf8', maxBuffer: 1 << 24 },
  );
  if (report.status !== 0) {
    console.error(`--duration: the report pass failed\n${report.stderr}`);
    process.exit(1);
  }
  const { atCap } = JSON.parse(report.stdout);
  const fits = Object.entries(atCap)
    .map(([cap, length]) => ({ cap: parseFloat(cap), total: length + bookends }))
    .sort((left, right) => left.cap - right.cap);
  const choice = fits.filter((entry) => entry.total <= max).pop() ?? fits[0];
  if (choice.total > max) {
    console.error(`--duration: even a ${choice.cap}s cap gives ${choice.total.toFixed(1)}s; shorten the flow`);
  } else if (choice.total < min) {
    console.error(`--duration: the take gives at most ${choice.total.toFixed(1)}s; add steps to reach ${min}s`);
  }
  options['max-static'] = choice.cap;
  return { range: `${min}-${max}s`, cap: choice.cap, expected: +choice.total.toFixed(1) };
};
const fitted =
  !options.report && !process.argv.includes('--max-static') && options.duration !== 'off'
    ? await fitDuration()
    : undefined;

/**
 * Caption times as the driver recorded them, in source frames. `timeline.json` is written by
 * `driver.mjs` on `stop`; without it every pause gets the plain `--max-static` cap.
 */
const timeline = (() => {
  const file = options.timeline ?? path.join(path.dirname(options.in), 'timeline.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
})();
// Sorted: a step's chapter is recorded when the step ends, after any caption raised inside it.
const captions = (timeline.steps ?? [])
  .map((step) => ({ ...step, frame: Math.round((step.ms / 1000) * options.fps) }))
  .sort((a, b) => a.frame - b.frame);
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
  return changed / samples.length > options.threshold || changed >= options['min-changed'];
};

/** The still-frame caps `--report` prices, and `--duration` chooses among. */
const CAPS = [0.3, 0.5, 0.8, 1, 1.5, 2, 3, 4, 6, 10, 1000];

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
        total +
        Math.min(length, captionFrames.has(start) ? Math.max(captionHold, cap * options.fps) : cap * options.fps),
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
        atCap: Object.fromEntries(CAPS.map((cap) => [`${cap}s`, seconds(motion + capped(cap))])),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// VP8 and VP9 are separate libraries in ffmpeg builds; a build with only VP8 still trims, at the older
// fixed bitrate, rather than failing outright.
const hasVp9 = spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout?.includes('libvpx-vp9');
const encoderArgs = hasVp9
  ? [
      '-c:v',
      'libvpx-vp9',
      '-crf',
      String(options.crf),
      '-b:v',
      '0',
      '-row-mt',
      '1',
      '-deadline',
      'good',
      '-cpu-used',
      '4',
    ]
  : ['-c:v', 'libvpx', '-b:v', '1400k'];

/** The line a chapter speaks: a step's `narration` (null when silent), else a caption's text. */
const spokenText = (caption) => (caption.narration === undefined ? caption.text : caption.narration);

/** Seconds from a chapter's start to its line, and from the line's end to the next chapter. */
const LINE_LEAD = 0.3;
const LINE_GAP = 0.4;

/**
 * Per caption, the fewest output frames its chapter may last: long enough for its spoken line, so the picture
 * waits for the narrator instead of the next line talking over this one. Zero without `--voiceover steps`, for
 * a silent step, and for a caption the next replaces at once (the chapter it would open is dropped).
 */
const minimumFrames = await (async () => {
  if (options.voiceover !== 'steps' && options.voiceover !== true) {
    return captions.map(() => 0);
  }
  const spoken = captions
    .map((caption, index) => ({ index, text: spokenText(caption) }))
    .filter(({ index, text }) => {
      const next = captions[index + 1];
      return text && (!next || next.frame - captions[index].frame >= options['min-chapter'] * options.fps);
    });
  if (!spoken.length) {
    return captions.map(() => 0);
  }
  const cuesFile = `${output.replace(/\.webm$/, '')}.lines.json`;
  writeFileSync(cuesFile, JSON.stringify(spoken.map(({ text }) => ({ at: 0, text }))));
  const synth = spawn(
    process.execPath,
    [
      path.join(path.dirname(new URL(import.meta.url).pathname), 'voiceover.mjs'),
      '--synth-only',
      '--cues',
      cuesFile,
      ...(typeof options.voice === 'string' ? ['--voice', options.voice] : []),
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  let text = '';
  synth.stdout.on('data', (chunk) => (text += chunk));
  const [code] = await once(synth, 'close');
  if (code !== 0) {
    console.error('--voiceover: could not synthesize the lines up front; chapters are not held for them');
    return captions.map(() => 0);
  }
  let cues;
  try {
    ({ cues } = JSON.parse(text));
  } catch {
    console.error('--voiceover: unreadable line lengths from voiceover.mjs; chapters are not held for them');
    return captions.map(() => 0);
  }
  const frames = captions.map(() => 0);
  spoken.forEach(({ index }, position) => {
    frames[index] = Math.ceil((LINE_LEAD + cues[position].duration + LINE_GAP) * options.fps);
  });
  return frames;
})();

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
  ...encoderArgs,
  '-y',
  output,
]);

// Both registered before any awaiting, for the reason above.
const decoderClosed = once(decoder, 'close');
const encoderClosed = once(encoder, 'close');

decoder.stderr.pipe(process.stderr);
encoder.stderr.pipe(process.stderr);

/**
 * Pipes a whole clip into the encoder at the demo's size and rate. Letterboxed rather than cropped, so a
 * 16:9 ident inside a 16:10 recording keeps its edges; video only, since the recording has no audio.
 */
const bookend = async (clip) => {
  const proc = spawn(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    clip,
    '-vf',
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`,
    '-r',
    String(options.fps),
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-f',
    'rawvideo',
    '-',
  ]);
  const closed = once(proc, 'close');
  proc.stderr.pipe(process.stderr);
  let frames = 0;
  for await (const chunk of proc.stdout) {
    frames += chunk.length;
    if (!encoder.stdin.write(chunk)) {
      await once(encoder.stdin, 'drain');
    }
  }
  const [code] = await closed;
  if (code !== 0) {
    console.error(`ffmpeg failed to decode ${clip} (exit ${code})`);
    process.exit(1);
  }
  return frames / frameBytes;
};

const introFrames = options.intro ? await bookend(options.intro) : 0;

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

/** The caption whose chapter is being written, where it began in the output, and the last frame written. */
let chapter = -1;
let chapterStart = 0;
let lastWritten;
let held = 0;

/** Repeats the chapter's last frame until it has lasted as long as its spoken line needs. */
const holdForLine = async () => {
  const short = chapter < 0 || !lastWritten ? 0 : minimumFrames[chapter] - (kept - chapterStart);
  for (let count = 0; count < short; count++) {
    if (!encoder.stdin.write(lastWritten)) {
      await once(encoder.stdin, 'drain');
    }
    kept++;
    held++;
  }
};

for await (const chunk of decoder.stdout) {
  pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
  while (pending.length >= frameBytes) {
    const frame = pending.subarray(0, frameBytes);
    pending = pending.subarray(frameBytes);
    const index = read++;

    while (chapter + 1 < captions.length && index >= captions[chapter + 1].frame) {
      await holdForLine();
      chapter++;
      chapterStart = kept;
    }

    staticRun = !previous || moved(frame, previous) ? 0 : staticRun + 1;
    longestRun = Math.max(longestRun, staticRun);

    // A caption's reading pause is never held for less than any other pause.
    const cap = readingWindow.has(index) ? Math.max(captionHoldFrames, holdFrames) : holdFrames;
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
    if (outputFrameOf.get(index) !== undefined) {
      lastWritten = previous;
    }
  }
}

await holdForLine();
const outroFrames = options.outro ? await bookend(options.outro) : 0;
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
/** One spoken line per chapter, for `--voiceover steps`. */
let stepCues = [];

const annotate = async () => {
  const at = (sourceFrame) => {
    for (let frame = sourceFrame; frame < read; frame++) {
      const output = outputFrameOf.get(frame);
      if (output !== undefined) {
        return (introFrames + output) / options.fps;
      }
    }
    return (introFrames + kept) / options.fps;
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
  // A beat after the chapter starts, so the line lands on the step rather than on the cut into it.
  stepCues = marks
    .map((mark) => ({ at: +(mark.start + LINE_LEAD).toFixed(2), text: spokenText(mark) }))
    .filter((cue) => cue.text);
  if (!marks.length) {
    return undefined;
  }

  const clock = (value) => {
    const hours = String(Math.floor(value / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
    const secs = (value % 60).toFixed(3).padStart(6, '0');
    return `${hours}:${minutes}:${secs}`;
  };

  const end = (introFrames + kept) / options.fps;
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

/**
 * iOS plays neither VP9 nor WebM from a file share, so a demo meant for a phone needs an H.264 copy. Video
 * only: iOS players reject the chapter and WebVTT tracks muxed into the WebM rather than ignoring them.
 */
const toMp4 = async () => {
  const mp4 = output.replace(/\.webm$/, '') + '.mp4';
  const transcode = spawn(FFMPEG, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    output,
    '-map',
    '0:v',
    '-map_chapters',
    '-1',
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-level',
    '5.1',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-preset',
    'slow',
    '-tag:v',
    'avc1',
    '-movflags',
    '+faststart',
    '-y',
    mp4,
  ]);
  transcode.stderr.pipe(process.stderr);
  const [code] = await once(transcode, 'close');
  return code === 0 ? mp4 : undefined;
};

const mp4 = options.mp4 ? await toMp4() : undefined;

/** Spoken as the intro opens; `--intro-line <text>` replaces it and `--intro-line off` drops it. */
const INTRO_LINE = 'This is Composer <break time="0.7s"/> by DXOS.';

/**
 * `--voiceover steps` narrates each chapter with its step's `narration` (or name); `--voiceover <cues.json>`
 * takes hand-written lines timed against the final video. With an intro, the intro line opens either. Both
 * run `voiceover.mjs` once over every output.
 */
const voiceover = async () => {
  const fromSteps = options.voiceover === 'steps' || options.voiceover === true;
  const cues = fromSteps ? stepCues : JSON.parse(readFileSync(options.voiceover, 'utf8'));
  if (!cues.length) {
    console.error('--voiceover steps: the recording has no steps (no timeline.json, or no captions or flow steps)');
    return undefined;
  }
  const introLine = typeof options['intro-line'] === 'string' ? options['intro-line'] : INTRO_LINE;
  const introSeconds = introFrames / options.fps;
  if (introFrames && options['intro-line'] !== 'off' && !cues.some((cue) => cue.at < introSeconds)) {
    cues.unshift({ at: 0.3, text: introLine });
  }
  const cuesFile = `${output.replace(/\.webm$/, '')}.cues.json`;
  writeFileSync(cuesFile, JSON.stringify(cues, null, 2));
  const inputs = [annotated?.video ?? output, mp4].filter(Boolean);
  const narrate = spawn(
    process.execPath,
    [
      path.join(path.dirname(new URL(import.meta.url).pathname), 'voiceover.mjs'),
      '--in',
      inputs.join(','),
      '--cues',
      cuesFile,
      ...(typeof options.voice === 'string' ? ['--voice', options.voice] : []),
      ...(options['allow-overlap'] ? ['--allow-overlap'] : []),
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  let text = '';
  narrate.stdout.on('data', (chunk) => (text += chunk));
  const [code] = await once(narrate, 'close');
  return code === 0 ? JSON.parse(text) : undefined;
};

const voiced = options.voiceover ? await voiceover() : undefined;
// A narration that was asked for and failed (overlapping cues, no voice) must not ship as a silent upload.
if (options.voiceover && !voiced) {
  console.error('--voiceover failed; nothing uploaded');
  process.exit(1);
}

/**
 * The Composer media bucket, served from its custom domain: demos land under `demos/<yyyy-mm-dd>-<name>.<ext>`,
 * named after the package the flow exercises (`plugin-markdown`) unless `--name` says otherwise.
 */
const MEDIA = {
  bucket: process.env.AUTOCUE_R2_BUCKET || 'composer',
  publicBase: 'https://assets.composer.space',
  folder: 'demos',
};

/** The package a flow lives in, from its path (`packages/plugins/plugin-markdown/autocue/…`). */
const flowPackage = timeline.flow?.match(/packages\/(?:[^/]+\/)*?([^/]+)\/autocue\//);

const uploadName = (() => {
  if (typeof options.name === 'string') {
    return options.name;
  }
  return flowPackage?.[1];
})();

/** Uploads the finished video (narrated MP4 first, since it plays everywhere) and returns its public URL. */
const upload = async () => {
  const video = [
    voiced?.outputs?.find((file) => file.endsWith('.mp4')),
    mp4,
    voiced?.outputs?.[0],
    annotated?.video,
    output,
  ]
    .filter(Boolean)
    .find((file) => existsSync(file));
  if (!uploadName) {
    console.error('upload skipped: no --name and the timeline names no flow package');
    return undefined;
  }
  if (!video) {
    console.error('upload skipped: no finished video found');
    return undefined;
  }
  const key = `${MEDIA.folder}/${new Date().toLocaleDateString('en-CA')}-${uploadName}${path.extname(video)}`;
  const script = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../hosting-artifacts/scripts/upload-artifact.mjs',
  );
  const proc = spawn(process.execPath, [script, video, '--key', key], {
    env: { ...process.env, R2_BUCKET: MEDIA.bucket, R2_PUBLIC_BASE: MEDIA.publicBase },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let text = '';
  proc.stdout.on('data', (chunk) => (text += chunk));
  const [code] = await once(proc, 'close');
  return code === 0 ? text.trim().split('\n').pop() : undefined;
};

const uploaded = options.upload !== 'off' && options.upload !== false ? await upload() : undefined;

/**
 * `--screenshot` adds the uploaded video to the flow's plugin as a `screenshots` entry in its `dx.config.ts`,
 * which is what the plugin registry shows.
 */
const addScreenshot = (url) => {
  const config = flowPackage && path.join(timeline.flow.slice(0, timeline.flow.indexOf('/autocue/')), 'dx.config.ts');
  if (!config || !existsSync(config)) {
    console.error(`--screenshot: no dx.config.ts beside the flow (${config ?? 'no flow in the timeline'})`);
    return undefined;
  }
  let source = readFileSync(config, 'utf8');
  if (source.includes(url)) {
    return config;
  }
  const entry = `{ dark: '${url}' }`;
  // A re-upload of the same demo replaces its earlier version (the URL differs only in `?v=`).
  const base = url.split('?')[0];
  if (source.includes(base)) {
    writeFileSync(
      config,
      source.replace(new RegExp(`${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?v=[0-9a-f]+)?`), url),
    );
    return config;
  }
  const list = source.match(/screenshots: \[([\s\S]*?)\n?(\s*)\],/);
  if (list) {
    const [whole, items] = list;
    const body = items.trim() ? `${items.replace(/,?\s*$/, '')}, ${entry}` : entry;
    source = source.replace(whole, `screenshots: [${body}],`);
  } else {
    source = source.replace(/(\n(\s*)icon: [^\n]*\n)/, `$1$2screenshots: [${entry}],\n`);
  }
  writeFileSync(config, source);
  // The insertion is not formatted to house style; oxfmt is what CI checks.
  spawnSync('npx', ['oxfmt', '--write', config], { stdio: 'ignore' });
  return config;
};

const screenshot = options.screenshot && uploaded ? addScreenshot(uploaded) : undefined;

const before = seconds ?? read / options.fps;
const after = kept / options.fps;
console.log(
  JSON.stringify(
    {
      output,
      annotated,
      mp4,
      voiced,
      uploaded,
      screenshot,
      frames: { read, kept, dropped: read - (kept - held), held, intro: introFrames, outro: outroFrames },
      seconds: { before: +before.toFixed(1), after: +after.toFixed(1) },
      reduction: `${Math.round((1 - after / before) * 100)}%`,
      longestStillRun: `${(longestRun / options.fps).toFixed(1)}s`,
      cap: `${options['max-static']}s`,
      fitted,
    },
    null,
    2,
  ),
);
