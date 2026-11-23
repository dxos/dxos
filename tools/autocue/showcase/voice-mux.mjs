#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Lays a prompter take onto its video. The prompter keeps recording while the reader finishes a section past its slot
 * and logs each such hold (`<take>.json`: `{ video, holds: [{ at, seconds }] }`), so the picture makes up that time
 * and the voice stays in step. `--fit stretch` (the default) slows the whole section that ran over, from its start to
 * `at`, so it lasts as long as the read; `--fit freeze` holds the frame at `at` instead. The voice is normalized to
 * -16 LUFS for the web.
 *
 * A take that logs `sections` (`[{ start, end, seconds }]`, written when the prompter plays sections slowed) is fitted
 * from those instead. Each section keeps the voice up to the end of its speech plus `--pad` seconds and drops the
 * silence after it (the wait before Next was pressed), and its picture is stretched to that length; `--no-trim` keeps
 * the whole of each section.
 *
 * Otherwise a section starts at the previous hold, or for the first one at `--lead` seconds: the first cue's time, read from
 * the prompter's `cues.json` beside the take when not given. The lead-in before it plays at normal speed.
 *
 *   node tools/autocue/showcase/voice-mux.mjs --video temp/voice/echo.mp4 --take temp/voice/echo-20261026-020432 \
 *     [--out temp/voice/echo-voiced.mp4] [--fit stretch|freeze] [--lead 3.5]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'video': { type: 'string' },
    'take': { type: 'string' },
    'out': { type: 'string' },
    'fit': { type: 'string', default: 'stretch' },
    'lead': { type: 'string' },
    'extra-last': { type: 'string', default: '2' },
    'pad': { type: 'string', default: '0.7' },
    'no-trim': { type: 'boolean', default: false },
  },
});
if (!values.video || !values.take) {
  console.error('usage: voice-mux.mjs --video <video.mp4> --take <take path without extension> [--out <file.mp4>]');
  process.exit(1);
}

const take = values.take.replace(/\.(webm|json)$/, '');
const out = values.out ?? `${take}.voiced.mp4`;
const {
  video: name,
  holds = [],
  sections = [],
} = existsSync(`${take}.json`) ? JSON.parse(readFileSync(`${take}.json`, 'utf8')) : {};
const cuesFile = join(dirname(take), 'cues.json');
const cues = existsSync(cuesFile) ? (JSON.parse(readFileSync(cuesFile, 'utf8'))[name] ?? []) : [];
const lead = Number(values.lead ?? cues[0]?.at ?? 0);
// Where the last section's picture ends; what follows (an end card) plays after the voice at normal speed.
const lastEnd = cues.at(-1)?.end;
const duration = Number(
  execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    values.video,
  ]).toString(),
);

const cuts = [...holds]
  .sort((left, right) => left.at - right.at)
  .map((hold) => ({ ...hold, at: Math.min(hold.at, duration) }));
const filters = [];
const labels = [];
const segment = (start, end, extra) => {
  if (end - start < 0.001 && Math.abs(extra) < 0.001) {
    return;
  }
  const label = `[v${labels.length}]`;
  const span = end - start;
  // Stretch slows the section evenly; freeze holds its last frame. Either way the segment gains `extra` seconds.
  const fit =
    Math.abs(extra) < 0.001
      ? ''
      : (values.fit === 'freeze' && extra > 0) || span < 0.5
        ? `,tpad=stop_mode=clone:stop_duration=${extra.toFixed(3)}`
        : `,setpts=PTS*${((span + extra) / span).toFixed(6)},fps=60`;
  filters.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS${fit}${label}`);
  labels.push(label);
};
// The voice's silences, each [start, end] in take time; a silence open at the start of the take starts at 0.
const silences = () => {
  const { stderr } = spawnSync(
    'ffmpeg',
    ['-nostdin', '-i', `${take}.webm`, '-af', 'silencedetect=noise=-40dB:d=0.6', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const gaps = [];
  let start = 0;
  for (const [, kind, value] of stderr.matchAll(/silence_(start|end): ([-\d.]*)/g)) {
    if (kind === 'start') {
      start = Number(value) || 0;
    } else {
      gaps.push([start, Number(value)]);
    }
  }
  return gaps;
};

// A take that logs its sections (played slowed, then held) gives each section's real length directly. Trimmed, a
// section keeps its voice to the end of its speech plus `--pad`, dropping the wait before Next. The last section ends
// before the end card and gets `--extra-last` seconds, so the voice finishes on its slide with a beat to spare.
const gaps = sections.length > 0 && !values['no-trim'] ? silences() : [];
let clock = lead;
const fitted = sections.map(({ start, end, seconds }, index) => {
  const last = index === sections.length - 1;
  const stop = Math.min(end, duration, last && lastEnd ? lastEnd : Infinity);
  const from = clock;
  clock += seconds;
  let keep = seconds - (Math.min(end, duration) - stop);
  if (!values['no-trim']) {
    const trailing = gaps.filter(([gapStart, gapEnd]) => gapStart >= from && gapStart < clock && gapEnd >= clock - 0.3);
    const speechEnd = trailing.length > 0 ? Math.min(...trailing.map(([gapStart]) => gapStart)) : clock;
    keep = Math.min(seconds, speechEnd - from + Number(values.pad));
  }
  const length = keep + (last ? Number(values['extra-last']) : 0);
  return { start, end: stop, extra: length - (stop - start), from, keep };
});
let cursor = 0;
if (fitted.length > 0) {
  for (const { start, end, extra } of fitted) {
    segment(cursor, start, 0);
    segment(start, end, extra);
    cursor = end;
  }
} else {
  if (values.fit !== 'freeze' && cuts.length > 0 && lead > 0 && lead < cuts[0].at) {
    segment(0, lead, 0);
    cursor = lead;
  }
  for (const hold of cuts) {
    segment(cursor, hold.at, hold.seconds);
    cursor = hold.at;
  }
}
segment(cursor, duration, 0);
if (fitted.length > 0) {
  console.table(
    fitted.map(({ start, end, from, keep, extra }) => ({
      start,
      end,
      from: +from.toFixed(2),
      keep: +keep.toFixed(2),
      picture: +(end - start + extra).toFixed(2),
    })),
  );
}
const total =
  fitted.length > 0
    ? duration + fitted.reduce((sum, { extra }) => sum + extra, 0)
    : duration + cuts.reduce((sum, hold) => sum + hold.seconds, 0);
filters.push(`${labels.join('')}concat=n=${labels.length}:v=1:a=0[v]`);
if (fitted.length > 0) {
  // The voice in step with the picture: the lead-in, then each section's kept stretch of the take.
  const slices = [[0, lead], ...fitted.map(({ from, keep }) => [from, from + keep])];
  filters.push(`[1:a]asplit=${slices.length}${slices.map((_, index) => `[s${index}]`).join('')}`);
  slices.forEach(([from, to], index) => {
    const length = index === 0 ? to - from : fitted[index - 1].end - fitted[index - 1].start + fitted[index - 1].extra;
    // The lead-in holds only the Record click and room noise, so it is silent; each slice fades in and out so no cut clicks.
    const level =
      index === 0
        ? ',volume=0'
        : `,afade=t=in:d=0.03,afade=t=out:st=${Math.max(0, to - from - 0.05).toFixed(3)}:d=0.05`;
    filters.push(
      `[s${index}]atrim=start=${from}:end=${to},asetpts=PTS-STARTPTS${level},apad,atrim=end=${length.toFixed(3)}[t${index}]`,
    );
  });
  filters.push(`${slices.map((_, index) => `[t${index}]`).join('')}concat=n=${slices.length}:v=0:a=1[voice]`);
  filters.push(`[voice]loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=end=${total.toFixed(3)}[a]`);
} else {
  // Silence pads a voice that ends before the picture; the picture's length decides the output's.
  filters.push(`[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=end=${total.toFixed(3)}[a]`);
}

execFileSync(
  'ffmpeg',
  [
    ...['-nostdin', '-hide_banner', '-loglevel', 'error', '-y'],
    ...['-i', values.video, '-i', `${take}.webm`],
    ...['-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]'],
    ...['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60'],
    ...['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out],
  ],
  { stdio: 'inherit' },
);
console.log(
  `wrote ${out}: ${total.toFixed(1)}s (${duration.toFixed(1)}s of picture, ${cuts.length} sections fitted by ${values.fit})`,
);
