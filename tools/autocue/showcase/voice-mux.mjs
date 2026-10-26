#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Lays a prompter take onto its video. The prompter keeps recording while the reader finishes a section past its slot
 * and logs each such hold (`<take>.json`: `{ holds: [{ at, seconds }] }`), so the picture freezes on its frame at
 * `at` for `seconds` and the voice stays in step. The voice is normalized to -16 LUFS for the web.
 *
 *   node tools/autocue/showcase/voice-mux.mjs --video temp/voice/echo.mp4 --take temp/voice/echo-20261026-020432 \
 *     [--out temp/voice/echo-voiced.mp4]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    video: { type: 'string' },
    take: { type: 'string' },
    out: { type: 'string' },
  },
});
if (!values.video || !values.take) {
  console.error('usage: voice-mux.mjs --video <video.mp4> --take <take path without extension> [--out <file.mp4>]');
  process.exit(1);
}

const take = values.take.replace(/\.(webm|json)$/, '');
const out = values.out ?? `${take}.voiced.mp4`;
const { holds = [] } = existsSync(`${take}.json`) ? JSON.parse(readFileSync(`${take}.json`, 'utf8')) : {};
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

// Cut the picture at each hold and freeze the cut's last frame for the hold's length; a hold at the end freezes the last frame.
const cuts = [...holds].sort((left, right) => left.at - right.at);
const bounds = [0, ...cuts.map((hold) => Math.min(hold.at, duration)), duration];
const filters = [];
const labels = [];
for (let index = 0; index < bounds.length - 1; index++) {
  const [start, end] = [bounds[index], bounds[index + 1]];
  const freeze = cuts[index]?.seconds ?? 0;
  if (end - start < 0.001 && freeze === 0) {
    continue;
  }
  const pad = freeze > 0 ? `,tpad=stop_mode=clone:stop_duration=${freeze.toFixed(3)}` : '';
  filters.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS${pad}[v${index}]`);
  labels.push(`[v${index}]`);
}
const total = duration + cuts.reduce((sum, hold) => sum + hold.seconds, 0);
filters.push(`${labels.join('')}concat=n=${labels.length}:v=1:a=0[v]`);
// Silence pads a voice that ends before the picture; the picture's length decides the output's.
filters.push(`[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=end=${total.toFixed(3)}[a]`);

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
console.log(`wrote ${out}: ${total.toFixed(1)}s (${duration.toFixed(1)}s of picture + ${cuts.length} holds)`);
