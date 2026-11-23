//
// Copyright 2026 DXOS.org
//

/**
 * Renders the Grid story frame by frame at an exact rate: each frame seeks the stepped story to its time, then
 * screenshots it into ffmpeg. A live screencast delivers about 25 frames a second at 1080p, which makes a camera
 * move judder however the result is re-encoded.
 *
 *   node render.mjs [--out composite.mp4] [--fps 60] [--url http://localhost:9009] [--theme light] [--hold 20000]
 *     [--holds 43300,19133,…] [--overlap 12000] [--duration 15000] [--supersample 2] [--story shift-clips]
 *     [--args 'shiftDistance:1;zoomMs:500']
 *
 * `--holds` sets each tour cell's hold in turn (one cell per entry), `--overlap` starts the zoom-out that long before
 * the last tour's hold ends, and `--duration` is the zoom-out's length; unset, the story's defaults apply.
 * `--supersample 2` screenshots each frame at twice the pixel density and area-averages it down, so the tiles do not
 * alias as the camera zooms out. `--story` renders another Grid story (`shift-clips`, `mosaic-tours`, …; see
 * GRID-TRANSITIONS.md), or any stepped story by its full id, and `--args` adds story args in Storybook's `key:value;…` URL form.
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'composite.mp4' },
    fps: { type: 'string', default: '60' },
    url: { type: 'string', default: 'http://localhost:9009' },
    theme: { type: 'string', default: 'light' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
    // How long the camera holds on each tour cell; it should match the tour clips' length.
    hold: { type: 'string' },
    holds: { type: 'string' },
    overlap: { type: 'string' },
    duration: { type: 'string' },
    supersample: { type: 'string', default: '1' },
    story: { type: 'string', default: 'default' },
    args: { type: 'string' },
  },
});

const fps = Number(values.fps);
const size = { width: Number(values.width), height: Number(values.height) };
const args = [
  'controls:!false',
  'stepped:!true',
  ...(values.hold ? [`hold:${Number(values.hold)}`] : []),
  ...(values.holds?.split(',').map((ms, step) => `holds[${step}]:${Math.round(Number(ms))}`) ?? []),
  ...(values.overlap ? [`overlap:${Number(values.overlap)}`] : []),
  ...(values.duration ? [`duration:${Number(values.duration)}`] : []),
  ...(values.args ? values.args.split(';') : []),
];
// A full story id (`tools-autocue-showcase--grid-only`) renders a story outside Grid.stories.tsx.
const storyId = values.story.includes('--') ? values.story : `tools-autocue-grid--${values.story}`;
// Encoded as one parameter each, so an `&` inside an arg value cannot start a new query parameter.
const url = `${values.url}/iframe.html?${new URLSearchParams({
  id: storyId,
  viewMode: 'story',
  args: args.join(';'),
  globals: `theme:${values.theme}`,
})}`;

// Full Chromium's headless mode has the GPU; the default headless shell renders WebGL in software.
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const supersample = Number(values.supersample);
// A higher device scale keeps the story's layout in CSS pixels and only adds pixels to downsample from.
const page = await browser.newPage({
  viewport: size,
  deviceScaleFactor: supersample,
  colorScheme: values.theme === 'dark' ? 'dark' : 'light',
});
/** Waits for the stepped story and every clip in it to load. */
const settle = async () => {
  await page.waitForFunction(() => window.grid !== undefined, undefined, { timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const videos = [...document.querySelectorAll('video')];
      // A story of numbered cells has no clips at all, so an empty page of videos is settled too.
      return videos.every((video) => video.readyState >= 2);
    },
    undefined,
    { timeout: 120_000 },
  );
};
await page.goto(url);
await settle();
const total = await page.evaluate(() => window.grid.total);
const frames = Math.ceil((total / 1_000) * fps);
console.log(`rendering ${frames} frames (${(total / 1_000).toFixed(1)}s at ${fps} fps) to ${values.out}`);

const ffmpeg = spawn(
  process.env.FFMPEG_PATH ?? 'ffmpeg',
  [
    ...['-hide_banner', '-loglevel', 'error', '-y'],
    ...['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'],
    ...(supersample > 1 ? ['-vf', `scale=${size.width}:${size.height}:flags=area`] : []),
    ...['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
    values.out,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

// A missing ffmpeg, or one that exits early (EPIPE on stdin), ends the render with its error rather than a crash.
let failure;
ffmpeg.on('error', (err) => (failure ??= err));
ffmpeg.stdin.on('error', (err) => (failure ??= err));

let code = 1;
try {
  const started = Date.now();
  for (let frame = 0; frame < frames; frame++) {
    if (failure) {
      throw failure;
    }
    // The shared storybook reloads the story when any file it serves changes; the frame is retried once it is back.
    for (let attempt = 0; ; attempt++) {
      try {
        await page.evaluate((ms) => window.grid.seek(ms), (frame * 1_000) / fps);
        break;
      } catch (err) {
        if (attempt >= 3) {
          throw err;
        }
        console.log(`story reloaded at frame ${frame} (${err.message.split('\n')[0]}); waiting for it`);
        await settle();
      }
    }
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ffmpeg.stdin.write(jpeg)) {
      await once(ffmpeg.stdin, 'drain');
    }
    if (frame % (fps * 5) === 0) {
      console.log(`${(frame / fps).toFixed(0)}s rendered, ${((Date.now() - started) / 1_000).toFixed(0)}s elapsed`);
    }
  }
  ffmpeg.stdin.end();
  [code] = await once(ffmpeg, 'close');
  console.log(code === 0 ? `wrote ${values.out}` : `ffmpeg exited with ${code}`);
} catch (err) {
  console.error(`render failed: ${err.message}`);
  ffmpeg.kill();
} finally {
  await browser.close();
}
process.exit(code ?? 1);
