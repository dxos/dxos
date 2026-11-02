//
// Copyright 2026 DXOS.org
//

// Renders the neu-dark 2D SaaS story (composition `saas2d`), silent.
//
//   node scripts/render-saas2d.mjs --stills 240,2052,10074   # PNG stills and a contact sheet, for review
//   node scripts/render-saas2d.mjs --out ../../temp/voice/saas2d-neu-dark.mp4
//   node scripts/render-saas2d.mjs --draft --scenes silo-comms:3,scale:5 --out ../../temp/voice/scale-draft.mp4
//
// `--clock` burns the scene and time into a full render; `--draft` renders flat shapes at half size with the scene and time burnt in, to review motion quickly; `--scenes`
// plays only those slides, with those holds (seconds).
//
// The video renders at 2x and is downscaled with a Lanczos filter, so glows and gradients on the dark field do not band.

import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({
  options: {
    stills: { type: 'string' },
    composition: { type: 'string', default: 'saas2d' },
    out: { type: 'string', default: path.join(root, '../../temp/voice/saas2d-neu-dark.mp4') },
    scale: { type: 'string', default: '2' },
    concurrency: { type: 'string', default: '6' },
    draft: { type: 'boolean', default: false },
    clock: { type: 'boolean', default: false },
    scenes: { type: 'string' },
  },
});

const inputProps = {
  ...(values.draft ? { draft: true } : {}),
  ...(values.clock ? { clock: true } : {}),
  ...(values.scenes
    ? {
        test: Object.fromEntries(
          values.scenes.split(',').map((entry) => {
            const [id, hold] = entry.split(':');
            return [id, Number(hold)];
          }),
        ),
      }
    : {}),
};

const browserExecutable = process.env.REMOTION_BROWSER || null;
const chromiumOptions = { gl: 'angle' };
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/components/Ident/remotion.ts') });
const composition = await selectComposition({
  serveUrl,
  id: values.composition,
  inputProps,
  browserExecutable,
  chromiumOptions,
});
const outDir = path.dirname(path.resolve(values.out));
fs.mkdirSync(outDir, { recursive: true });

if (values.stills) {
  const frames = values.stills.split(',').map(Number);
  const files = [];
  for (const frame of frames) {
    const output = path.join(outDir, `${values.composition}-${String(frame).padStart(5, '0')}.png`);
    await renderStill({ serveUrl, composition, frame, output, inputProps, browserExecutable, chromiumOptions });
    files.push(output);
    console.log(`wrote ${output}`);
  }
  // xstack needs at least two inputs; a single still is its own sheet.
  if (files.length === 1) {
    process.exit(0);
  }
  const sheet = path.join(outDir, `${values.composition}.contact.png`);
  const columns = Math.min(4, files.length);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    ...files.flatMap((file) => ['-i', file]),
    '-filter_complex',
    `${files.map((_, index) => `[${index}]scale=480:-1[s${index}]`).join(';')};${files.map((_, index) => `[s${index}]`).join('')}xstack=inputs=${files.length}:layout=${files
      .map((_, index) => `${(index % columns) * 480}_${Math.floor(index / columns) * 270}`)
      .join('|')}:fill=black`,
    sheet,
  ]);
  console.log(`wrote ${sheet}`);
} else if (values.draft) {
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    crf: 24,
    x264Preset: 'veryfast',
    scale: 0.5,
    concurrency: Number(values.concurrency),
    outputLocation: values.out,
    browserExecutable,
    chromiumOptions,
  });
  console.log(`wrote ${values.out}`);
} else {
  const scale = Number(values.scale);
  const big = values.out.replace(/\.mp4$/, `.${scale}x.mp4`);
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    crf: 10,
    scale,
    concurrency: Number(values.concurrency),
    outputLocation: big,
    browserExecutable,
    chromiumOptions,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 1000) % 25 === 0) {
        console.log(`${Math.round(progress * 100)}%`);
      }
    },
  });
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    big,
    '-vf',
    // A fine static dither at the final size breaks up the 8-bit steps in the dark field's gradients; a temporal one
    // would multiply the file size, since changing noise does not compress.
    `scale=${composition.width}:${composition.height}:flags=lanczos,noise=alls=3:allf=u,format=yuv420p`,
    '-c:v',
    'libx264',
    '-crf',
    '14',
    '-preset',
    'slow',
    '-tune',
    'grain',
    '-movflags',
    '+faststart',
    values.out,
  ]);
  fs.rmSync(big);
  console.log(`wrote ${values.out}`);
}
