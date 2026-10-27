#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Assembles hand-recorded clips (Screen Studio exports) into the Grid composite: `tour-1`..`tour-<n>` become the tour
 * cells in order, every other video or screenshot a grid cell. Inputs are normalized to 1920x1080 at 60 fps (a screenshot
 * becomes a still clip), laid out by `layout.mjs` so a repeated clip is never near itself, and rendered frame by frame
 * by `render.mjs`. The composite is written back beside the clips as `composite.mp4`. Recording steps: docs/SHOWCASE.md.
 *
 *   node tools/autocue/showcase/assemble.mjs --clips /Volumes/SSD1/Media/Showcase/2026-10-17 [--hold 20000] [--still 3]
 *     [--full] [--overlap 12000] [--zoom 15000] [--reuse-tours] [--once map,spacetime] [--min 3] [--theme light]
 *     [--pin explorer@3,2] [--supersample 2]
 *
 * `--full` holds each tour for its own clip's length instead of `--hold`; `--overlap` starts the zoom-out that long
 * before the last tour ends, so its clip plays on as the grid is revealed; `--zoom` is the zoom-out's length.
 */

import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { storybook } from './storybook.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const { values: options } = parseArgs({
  options: {
    'clips': { type: 'string' },
    'hold': { type: 'string', default: '20000' },
    'still': { type: 'string', default: '3' },
    'full': { type: 'boolean', default: false },
    'overlap': { type: 'string' },
    'zoom': { type: 'string' },
    'reuse-tours': { type: 'boolean', default: false },
    'once': { type: 'string' },
    'pin': { type: 'string', multiple: true, default: [] },
    'supersample': { type: 'string', default: '1' },
    'min': { type: 'string', default: '3' },
    'theme': { type: 'string', default: 'light' },
    'storybook': { type: 'string', default: 'http://localhost:9009' },
  },
});
if (!options.clips) {
  console.error('usage: assemble.mjs --clips <folder> [--hold 20000] [--still 3]');
  process.exit(2);
}

const SOURCE = path.resolve(options.clips);
const RUN = path.join(ROOT, 'temp', 'showcase', `manual-${path.basename(SOURCE)}`);
const CLIPS = path.join(RUN, 'clips', 'light');
const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
const IMAGE = /\.(png|jpe?g)$/i;
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` };
const log = (line) => console.log(`[assemble] ${line}`);

const run = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, env });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => resolve({ code, output }));
  });

// Letterboxed rather than stretched, so a recording that is not exactly 16:9 keeps its proportions, in the theme's page
// colour. The outermost pixel on each edge is replaced by the one inside it: Screen Studio's export bleeds its
// background colour 1px into the frame.
const PAD = options.theme === 'dark' ? '0x101010' : '0xffffff';
const FRAME =
  `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${PAD},fps=60,` +
  'fillborders=left=1:right=1:top=1:bottom=1:mode=smear';
const ENCODE = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an'];

const inputs = readdirSync(SOURCE)
  .filter((file) => !file.startsWith('.') && !file.startsWith('composite') && (VIDEO.test(file) || IMAGE.test(file)))
  .sort();
const name = (file) =>
  path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
const step = (file) => Number(name(file).slice('tour-'.length));
const tours = inputs.filter((file) => /^tour-\d+$/.test(name(file))).sort((a, b) => step(a) - step(b));
const cells = inputs.filter((file) => !tours.includes(file));
log(`${tours.length} tour clips, ${cells.length} grid clips in ${SOURCE}`);
if (tours.length < 1 || tours.some((file, index) => step(file) !== index + 1)) {
  console.error('need tour-1 … tour-<n>, numbered from 1 without gaps; see docs/SHOWCASE.md');
  process.exit(1);
}

rmSync(CLIPS, { recursive: true, force: true });
mkdirSync(CLIPS, { recursive: true });
for (const file of inputs) {
  const out = path.join(CLIPS, `${name(file)}.mp4`);
  const source = path.join(SOURCE, file);
  const args = IMAGE.test(file) ? ['-loop', '1', '-t', options.still, '-i', source] : ['-i', source];
  const { code, output } = await run('ffmpeg', ['-v', 'error', '-y', ...args, '-vf', FRAME, ...ENCODE, out]);
  log(`${file} → ${path.basename(out)}${code === 0 ? '' : ` FAILED: ${output.trim().split('\n').pop()}`}`);
}

// The grid cells around the tours: fewer clips repeat, and layout.mjs keeps each repeat away from itself.
const layout = await run(process.execPath, [
  path.join(HERE, 'layout.mjs'),
  ...['--run', path.relative(ROOT, RUN), '--tour', tours.map(name).join(','), '--tours', String(tours.length)],
  ...['--min', options.min, ...(options['reuse-tours'] ? ['--reuse-tours'] : [])],
  ...(options.once ? ['--once', options.once] : []),
  ...options.pin.flatMap((pin) => ['--pin', pin]),
]);
console.log(layout.output.trim());
if (layout.code !== 0) {
  process.exit(1);
}

/** Each tour's length in ms, from its normalized clip, so `--full` holds the camera for the whole clip. */
const holds = [];
for (const file of tours) {
  const probe = await run('ffprobe', [
    ...['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0'],
    path.join(CLIPS, `${name(file)}.mp4`),
  ]);
  holds.push(Math.floor(Number(probe.output.trim()) * 1_000));
}
log(`tours: ${tours.map((file, index) => `${name(file)} ${(holds[index] / 1_000).toFixed(2)}s`).join(', ')}`);
const timing = [
  ...(options.full ? ['--holds', holds.join(',')] : ['--hold', options.hold]),
  ...(options.overlap ? ['--overlap', options.overlap] : []),
  ...(options.zoom ? ['--duration', options.zoom] : []),
  ...['--supersample', options.supersample],
];

const book = await storybook({ root: ROOT, url: options.storybook, env, log });
if (!book.ok) {
  console.error(`no storybook answered on ${options.storybook}`);
  process.exit(1);
}
const out = path.join(RUN, 'composite.mp4');
let render;
// A cold storybook can reload the story mid-render; the retry finds it warm.
for (let attempt = 0; attempt < 2 && !(render?.code === 0 && existsSync(out)); attempt++) {
  log(`rendering the composite${attempt > 0 ? ' (retry)' : ''}`);
  render = await run(process.execPath, [
    path.join(HERE, 'render.mjs'),
    ...['--out', out, '--fps', '60', '--theme', options.theme, ...timing, '--url', options.storybook],
  ]);
}
book.stop?.();
if (render.code !== 0) {
  console.error(render.output.trim().split('\n').slice(-12).join('\n'));
  process.exit(1);
}
copyFileSync(out, path.join(SOURCE, 'composite.mp4'));
mkdirSync(path.join(ROOT, 'temp', 'composite'), { recursive: true });
copyFileSync(out, path.join(ROOT, 'temp', 'composite', 'composite.mp4'));
log(`composite → ${path.join(SOURCE, 'composite.mp4')}`);
