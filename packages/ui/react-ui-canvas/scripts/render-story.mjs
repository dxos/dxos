#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/**
 * Renders a storybook story to video frame by frame, not in real time: the page runs on Playwright's fake clock, and
 * each frame advances it by exactly 1/fps before it is captured, however long the page takes to draw. An animation too
 * heavy to play smoothly live still comes out smooth.
 *
 * Everything the story animates must run on timers, animation frames and `performance.now` (which the fake clock
 * drives), not CSS transitions (which run on the compositor's own clock and would not be stepped).
 *
 * Usage:
 *   node scripts/render-story.mjs --story plugins-plugin-canvas-samples-dataflow--transition-extension \
 *     [--seconds 20] [--fps 30|60] [--width 1920] [--height 1080] [--scale <device pixels per css pixel>] \
 *     [--globals theme:dark] [--url http://localhost:9010] [--out temp/<story>.mp4]
 *
 * Needs the story's storybook running at `--url`. Encodes MP4 (H.264) with the ffmpeg on PATH (or FFMPEG_PATH); if that
 * cannot encode H.264 it falls back to Playwright's bundled ffmpeg and writes WebM (VP8) instead.
 */

import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({
  options: {
    story: { type: 'string' },
    seconds: { type: 'string', default: '20' },
    fps: { type: 'string', default: '30' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
    scale: { type: 'string' },
    globals: { type: 'string', default: 'theme:dark' },
    url: { type: 'string', default: 'http://localhost:9010' },
    out: { type: 'string' },
  },
});

if (!options.story) {
  console.error(
    '--story <storybook id> is required, e.g. plugins-plugin-canvas-samples-dataflow--transition-extension',
  );
  process.exit(1);
}

const fps = Number(options.fps);
if (fps !== 30 && fps !== 60) {
  console.error('--fps must be 30 or 60');
  process.exit(1);
}
const width = Number(options.width);
const height = Number(options.height);
// A css layout about 1280 wide by default, so captions and controls keep the size they have on a laptop screen.
const scale = Number(options.scale ?? width / 1280);
const frames = Math.round(Number(options.seconds) * fps);
const step = 1000 / fps;

/** An ffmpeg that can encode H.264, if any; else Playwright's, which encodes only VP8. */
const encoder = () => {
  const candidate = process.env.FFMPEG_PATH ?? 'ffmpeg';
  const probe = spawnSync(candidate, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (probe.status === 0 && probe.stdout.includes('libx264')) {
    return { ffmpeg: candidate, format: 'mp4' };
  }
  const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
  const bundled = existsSync(cache)
    ? readdirSync(cache)
        .filter((name) => name.startsWith('ffmpeg-'))
        .map((name) => path.join(cache, name, process.platform === 'darwin' ? 'ffmpeg-mac' : 'ffmpeg-linux'))
        .find((file) => existsSync(file))
    : undefined;
  if (!bundled) {
    console.error(`No usable ffmpeg: ${candidate} cannot encode H.264 and Playwright's bundled ffmpeg is missing.`);
    process.exit(1);
  }
  console.warn(
    `${candidate} cannot encode H.264 (try \`brew reinstall ffmpeg\`); writing WebM with Playwright's ffmpeg.`,
  );
  return { ffmpeg: bundled, format: 'webm' };
};

const { ffmpeg, format: available } = encoder();
// Lossless frames where the encoder can read them: JPEG would smooth away the dither that hides gradient bands.
const lossless = available === 'mp4';
// An `--out` file's extension picks the container; otherwise the best the encoder can do.
const asked = options.out && path.extname(options.out).slice(1);
const format = asked === 'webm' || asked === 'mp4' ? asked : available;
if (format === 'mp4' && available !== 'mp4') {
  console.error('MP4 needs an ffmpeg that can encode H.264; write a .webm instead.');
  process.exit(1);
}
const out = path.resolve(options.out ?? path.join('temp', `${options.story}.${format}`));
mkdirSync(path.dirname(out), { recursive: true });

// Each frame is piped to the encoder as it is captured (as Playwright's own recorder does), so nothing waits on disk.
const codec =
  format === 'mp4'
    ? // Tuned for grain and at high quality, so the dither that keeps dim gradients smooth survives the encode.
      [
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-tune',
        'grain',
        '-crf',
        '12',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
      ]
    : available === 'mp4'
      ? // A full ffmpeg: VP9 at constant quality, as Autocue encodes.
        ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '24', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2']
      : // Playwright's ffmpeg, which has only VP8.
        [
          '-c:v',
          'libvpx',
          '-b:v',
          '0',
          '-crf',
          '8',
          '-qmin',
          '0',
          '-qmax',
          '20',
          '-deadline',
          'good',
          '-cpu-used',
          '1',
        ];
const encoding = spawn(
  ffmpeg,
  [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(fps),
    '-f',
    'image2pipe',
    '-c:v',
    lossless ? 'png' : 'mjpeg',
    '-i',
    'pipe:0',
    ...codec,
    out,
  ],
  { stdio: ['pipe', 'ignore', 'inherit'] },
);
const encoded = once(encoding, 'close');

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: Math.round(width / scale), height: Math.round(height / scale) },
  deviceScaleFactor: scale,
});
const page = await context.newPage();

// Installed before the page loads, so every timer it ever sets is on the fake clock. Time flows until paused below,
// which lets storybook boot as it normally would.
await page.clock.install({ time: 0 });
const query = new URLSearchParams({ id: options.story, viewMode: 'story', globals: options.globals });
await page.goto(`${options.url}/iframe.html?${query}`);
await page.waitForSelector('[data-testid="scene-view"]', { timeout: 120_000 });
await page.clock.pauseAt((await page.evaluate(() => Date.now())) + step);

/** Lets the page finish the work a clock step started (React renders on message events, which the clock leaves real). */
/** The frame the page last drew, if it marks one (`data-frame-time` on any element); undefined otherwise. */
const drawn = () =>
  page.evaluate(() => document.querySelector('[data-frame-time]')?.getAttribute('data-frame-time') ?? undefined);

const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const channel = new MessageChannel();
        let turns = 0;
        channel.port1.onmessage = () => (++turns < 3 ? channel.port2.postMessage(0) : resolve(undefined));
        channel.port2.postMessage(0);
      }),
  );

const started = Date.now();
for (let frame = 0; frame < frames; frame++) {
  const before = await drawn();
  await page.clock.runFor(step);
  // React splits a large render into small tasks, so wait for the page to mark the new frame drawn; a few turns of the
  // event loop alone can leave the capture a frame behind on a busy frame, which shows as a stutter.
  if (before !== undefined) {
    await page
      .waitForFunction(
        (last) => document.querySelector('[data-frame-time]')?.getAttribute('data-frame-time') !== last,
        before,
        {
          timeout: 10_000,
          polling: 'raf',
        },
      )
      .catch(() => undefined);
  }
  await settle();
  const image = lossless
    ? await page.screenshot({ type: 'png' })
    : await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!encoding.stdin.write(image)) {
    await once(encoding.stdin, 'drain');
  }
  if ((frame + 1) % fps === 0 || frame === frames - 1) {
    const elapsed = (Date.now() - started) / 1000;
    const left = (elapsed / (frame + 1)) * (frames - frame - 1);
    console.log(`frame ${frame + 1}/${frames} (${elapsed.toFixed(0)}s, about ${left.toFixed(0)}s left)`);
  }
}
await browser.close();

encoding.stdin.end();
const [code] = await encoded;
if (code !== 0) {
  console.error(`ffmpeg exited with ${code}`);
  process.exit(1);
}
console.log(`wrote ${out} (${frames} frames, ${width}x${height} at ${fps} fps)`);
