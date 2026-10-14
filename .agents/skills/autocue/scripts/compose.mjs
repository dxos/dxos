#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Tiles several recordings of one session side by side into a single video, on one shared timeline.
 *
 * Each input is a pane: it is labelled in a header band, delayed by its `offsetMs` so every pane shows the
 * same wall-clock instant, and held on its last frame until the longest pane ends. Step captions span the
 * whole width in a footer band, which a per-page banner cannot do (it would be cut in half, or repeated).
 * Text is passed to `drawtext` by file rather than inline, so a caption needs no filtergraph escaping.
 *
 *   node compose.mjs --in alice.webm --label Alice --in bob.webm --label Bob \
 *     --offsets 0,140 --timeline timeline.json --out side-by-side.webm [--mp4 on]
 *
 * `pair.mjs` calls `composeSideBySide` itself; the CLI is for re-composing (other labels, a different gap,
 * an MP4 copy) without re-recording.
 */

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';

const BACKGROUND = '0x111111';

/** Seconds of media in a file; a VFR screencast has no reliable stream duration, so the container's is read. */
export const probeDuration = (file) => {
  const result = spawnSync(
    FFPROBE,
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
    { encoding: 'utf8' },
  );
  const seconds = Number(result.stdout.trim());
  if (result.status !== 0 || !Number.isFinite(seconds)) {
    throw new Error(`ffprobe could not read the duration of ${file}: ${result.stderr.trim()}`);
  }
  return seconds;
};

/** Pixel size of the first video stream. */
const probeSize = (file) => {
  const result = spawnSync(
    FFPROBE,
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  const [width, height] = result.stdout.trim().split(',').map(Number);
  if (!width || !height) {
    throw new Error(`ffprobe could not read the frame size of ${file}`);
  }
  return { width, height };
};

/** `drawtext` needs a font file wherever fontconfig is absent from the ffmpeg build; `FONT_FILE` overrides. */
const findFont = () => {
  if (process.env.FONT_FILE) {
    return process.env.FONT_FILE;
  }
  const result = spawnSync('fc-match', ['-f', '%{file}', 'sans-serif:bold'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout ? result.stdout : undefined;
};

/** `HH:MM:SS.mmm`, the WebVTT cue time format. */
const vttTime = (ms) => {
  const total = Math.max(0, Math.round(ms));
  const hours = String(Math.floor(total / 3_600_000)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3_600_000) / 60_000)).padStart(2, '0');
  const seconds = String(Math.floor((total % 60_000) / 1000)).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}.${String(total % 1000).padStart(3, '0')}`;
};

/** Filtergraph option values are `:`-separated, so a path carrying `:` or `\` must be escaped. */
const filterPath = (file) => file.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

/**
 * Composes `inputs` into one side-by-side video.
 *
 * @param {{
 *   inputs: Array<{ file: string, label?: string, offsetMs?: number }>,
 *   captions?: Array<{ ms: number, text: string, subtitle?: string }>,
 *   out: string,
 *   gap?: number,
 *   fps?: number,
 *   crf?: number,
 *   mp4?: boolean,
 * }} options
 * @returns {Promise<{ file: string, mp4?: string, vtt?: string, seconds: number, size: { width: number, height: number } }>}
 */
export const composeSideBySide = async ({ inputs, captions = [], out, gap = 16, fps = 25, crf = 30, mp4 = false }) => {
  if (inputs.length < 2) {
    throw new Error('side-by-side needs at least two inputs');
  }
  const textDir = path.join(path.dirname(out), `${path.basename(out, path.extname(out))}.text`);
  mkdirSync(textDir, { recursive: true });

  // Every pane is fitted to the first one's size: hstack requires equal heights, and a peer whose viewport
  // differs is letterboxed rather than stretched.
  const { width, height } = probeSize(inputs[0].file);
  // Bands scale with the frame so a 2x recording does not get 1x-sized text.
  const unit = Math.max(1, Math.round(height / 900));
  const header = 44 * unit;
  const footer = captions.length ? 76 * unit : 0;
  const scaledGap = gap * unit;
  const font = findFont();
  const fontOption = font ? `fontfile='${filterPath(font)}':` : '';

  const spans = inputs.map((input) => ({
    ...input,
    offsetMs: input.offsetMs ?? 0,
    seconds: probeDuration(input.file),
  }));
  const totalSeconds = Math.max(...spans.map((span) => span.offsetMs / 1000 + span.seconds));

  const chains = spans.map((span, index) => {
    const labelFile = path.join(textDir, `label-${index}.txt`);
    writeFileSync(labelFile, span.label ?? path.basename(span.file, path.extname(span.file)));
    const rightPad = index < spans.length - 1 ? scaledGap : 0;
    return [
      `[${index}:v]setpts=PTS-STARTPTS`,
      `fps=${fps}`,
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${BACKGROUND}`,
      // A pane that started late opens on its first frame and one that ended early holds its last, so
      // every pane spans the whole timeline and stays aligned with the others.
      `tpad=start_mode=clone:start_duration=${(span.offsetMs / 1000).toFixed(3)}:stop_mode=clone:stop_duration=${totalSeconds.toFixed(3)}`,
      `pad=${width + rightPad}:${height + header}:0:${header}:color=${BACKGROUND}`,
      `drawtext=${fontOption}expansion=none:textfile='${filterPath(labelFile)}':fontcolor=white:fontsize=${22 * unit}:x=(${width}-tw)/2:y=(${header}-th)/2[pane${index}]`,
    ].join(',');
  });

  const stacked = `${spans.map((_, index) => `[pane${index}]`).join('')}hstack=inputs=${spans.length}`;
  const captionFilters = captions.flatMap((caption, index) => {
    const start = caption.ms / 1000;
    const end = index < captions.length - 1 ? captions[index + 1].ms / 1000 : totalSeconds;
    const enable = `enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'`;
    const titleFile = path.join(textDir, `caption-${index}.txt`);
    writeFileSync(titleFile, caption.text);
    const filters = [
      `drawtext=${fontOption}expansion=none:textfile='${filterPath(titleFile)}':fontcolor=white:fontsize=${26 * unit}:x=(w-tw)/2:y=h-${footer}+${caption.subtitle ? 12 * unit : 24 * unit}:${enable}`,
    ];
    if (caption.subtitle) {
      const subtitleFile = path.join(textDir, `subtitle-${index}.txt`);
      writeFileSync(subtitleFile, caption.subtitle);
      filters.push(
        `drawtext=${fontOption}expansion=none:textfile='${filterPath(subtitleFile)}':fontcolor=0xaaaaaa:fontsize=${18 * unit}:x=(w-tw)/2:y=h-${footer}+${46 * unit}:${enable}`,
      );
    }
    return filters;
  });
  const tail = [
    ...(footer ? [`pad=iw:ih+${footer}:0:0:color=${BACKGROUND}`] : []),
    ...captionFilters,
    'format=yuv420p',
  ].join(',');
  const graph = [...chains, `${stacked},${tail}[out]`].join(';');

  const encode = async (file, codecArgs) => {
    const encoder = spawn(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      ...spans.flatMap((span) => ['-i', span.file]),
      '-filter_complex',
      graph,
      '-map',
      '[out]',
      '-t',
      totalSeconds.toFixed(3),
      ...codecArgs,
      '-y',
      file,
    ]);
    encoder.stderr.pipe(process.stderr);
    const [code] = await once(encoder, 'close');
    if (code !== 0) {
      throw new Error(`ffmpeg exited ${code} composing ${file}`);
    }
  };

  await encode(out, [
    '-c:v',
    'libvpx-vp9',
    '-crf',
    String(crf),
    '-b:v',
    '0',
    '-row-mt',
    '1',
    '-deadline',
    'good',
    '-cpu-used',
    '4',
  ]);
  const result = {
    file: out,
    seconds: totalSeconds,
    size: { width: spans.length * width + (spans.length - 1) * scaledGap, height: height + header + footer },
  };

  if (mp4) {
    // iOS plays neither VP9 nor WebM from a file share, so a phone needs an H.264 copy.
    result.mp4 = out.replace(/\.webm$/, '') + '.mp4';
    await encode(result.mp4, ['-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart']);
  }

  if (captions.length) {
    result.vtt = out.replace(/\.webm$/, '') + '.vtt';
    const cues = captions.map((caption, index) => {
      const end = index < captions.length - 1 ? captions[index + 1].ms : totalSeconds * 1000;
      const text = caption.subtitle ? `${caption.text}\n${caption.subtitle}` : caption.text;
      return `${vttTime(caption.ms)} --> ${vttTime(end)}\n${text}`;
    });
    writeFileSync(result.vtt, `WEBVTT\n\n${cues.join('\n\n')}\n`);
  }
  return result;
};

const parseArgs = (args) => {
  const options = { inputs: [], gap: 16, crf: 30, mp4: false };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    switch (key) {
      case 'in':
        options.inputs.push({ file: value });
        break;
      case 'label':
        options.inputs.at(-1).label = value;
        break;
      case 'offsets':
        value.split(',').forEach((offset, inputIndex) => {
          options.inputs[inputIndex].offsetMs = Number(offset);
        });
        break;
      case 'timeline': {
        // `pair.mjs` writes the offsets and captions here, captions in `driver.mjs`'s `steps` shape so
        // `trim-static.mjs` reads the same file; explicit `--offsets` still win.
        const timeline = JSON.parse(readFileSync(value, 'utf8'));
        options.captions = timeline.steps;
        timeline.peers?.forEach((peer, inputIndex) => {
          if (options.inputs[inputIndex]) {
            options.inputs[inputIndex].offsetMs ??= peer.offsetMs;
            options.inputs[inputIndex].label ??= peer.name;
          }
        });
        break;
      }
      case 'mp4':
        options.mp4 = value === 'on';
        break;
      default:
        options[key] = /^[\d.]+$/.test(value) ? Number(value) : value;
    }
  }
  return options;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.out) {
    console.error(
      'usage: compose.mjs --in a.webm [--label A] --in b.webm [--label B] [--offsets 0,120] [--timeline t.json] --out out.webm',
    );
    process.exit(2);
  }
  const result = await composeSideBySide(options);
  console.log(JSON.stringify(result, null, 2));
}
