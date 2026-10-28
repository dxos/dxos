//
// Copyright 2026 DXOS.org
//

/**
 * Renders the slides to a video frame by frame at an exact rate. The page runs on a virtual clock: each frame advances
 * it by 1/fps, runs the animation loop once, seeks every CSS transition to the same time, and screenshots the result
 * into ffmpeg. A live screencast drops frames, so camera moves would judder; this cannot.
 *
 *   node record.mjs [--out echo3d.mp4] [--fps 60] [--url http://localhost:7420] [--width 1920] [--height 1080]
 *     [--from blank] [--to company-fills] [--supersample 1] [--holds holds.json]
 *
 * Each slide holds for HOLDS[id] seconds from the moment it is entered, then the next one starts; `--holds` names a
 * JSON file of `{ id: seconds }` that overrides them, so a voice-over can set its own pace. Sound is not
 * recorded: the page synthesises it live, so it would be laid in afterwards.
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'echo3d.mp4' },
    fps: { type: 'string', default: '60' },
    url: { type: 'string', default: 'http://localhost:7420' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
    from: { type: 'string', default: 'blank' },
    to: { type: 'string', default: 'company-fills' },
    // Pixel density the page renders at; 2 renders at twice the size and scales down, smoothing edges, but thins
    // one-pixel lines (the lattice) and takes about four times as long.
    supersample: { type: 'string', default: '1' },
    holds: { type: 'string' },
  },
});

// Seconds each slide is on screen, from the moment it is entered (its move in included); timed to SPEAKING-TRACK.md.
const HOLDS = {
  'blank': 1.5,
  'beginning': 4,
  'silo': 3.5,
  'silo-comms': 7,
  'scale': 6,
  'competitors': 8.5,
  'spread': 4,
  'spread-comms': 6,
  'frontier': 3.5,
  'frontier-comms': 11,
  'orbit': 8.5,
  'absorb': 6.5,
  'rivals': 5.5,
  // Runs on into its second stage (merge-2), so it holds for both.
  'merge-1': 7,
  'final-frontier': 6,
  'engulf': 12,
  'dont-panic': 5,
  'spread-again': 4,
  'echo-hub': 6.5,
  'echo-spaces': 9.5,
  'objects': 5,
  'object-detail': 6.5,
  'object-thread': 10.5,
  'object-created': 14,
  'echo-spaces-again': 10,
  'echo-hub-again': 4,
  'saas-merge': 9,
  'company-fills': 10,
};
const DEFAULT_HOLD = 5;
if (values.holds) {
  Object.assign(HOLDS, JSON.parse(readFileSync(values.holds, 'utf8')));
}

const fps = Number(values.fps);
const width = Number(values.width);
const height = Number(values.height);

// The virtual clock, installed before the page's own scripts: performance.now and requestAnimationFrame answer to
// `__step`, and every CSS transition is paused and seeked to the same clock, so a frame is exactly 1/fps of the show.
const virtualClock = () => {
  let now = 0;
  let callbacks = [];
  performance.now = () => now;
  window.requestAnimationFrame = (callback) => callbacks.push(callback);
  const started = new WeakMap();
  window.__step = (milliseconds) => {
    now += milliseconds;
    const running = callbacks;
    callbacks = [];
    for (const callback of running) {
      callback(now);
    }
    for (const animation of document.getAnimations()) {
      if (!started.has(animation)) {
        started.set(animation, now);
        animation.pause();
      }
      const elapsed = now - started.get(animation);
      if (elapsed >= animation.effect.getComputedTiming().endTime) {
        animation.finish();
      } else {
        animation.currentTime = elapsed;
      }
    }
  };
};

const browser = await chromium.launch({
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=metal', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(values.supersample) });
await page.addInitScript(virtualClock);
// The pager is for presenting; it has no place in the video.
await page.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    document.head.append(Object.assign(document.createElement('style'), { textContent: '#hud { display: none; }' }));
  });
});
page.on('pageerror', (error) => console.error('page error:', error.message));
await page.goto(`${values.url}/#${values.from}`);
await page.waitForFunction(() => typeof window.__step === 'function' && document.fonts.status === 'loaded');
// A couple of frames so the first scene is laid out before recording starts.
await page.evaluate(() => window.__step(0));
await page.evaluate(() => window.__step(0));

const ffmpeg = spawn(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'image2pipe',
    '-framerate',
    String(fps),
    '-i',
    '-',
    // Area-average the supersampled frame down to the output size.
    '-vf',
    `scale=${width}:${height}:flags=area`,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    // Low CRF and the grain tune keep the renderer's dither, which a smoother encode would flatten back into bands.
    '-crf',
    '12',
    '-tune',
    'grain',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    values.out,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

const frameMs = 1000 / fps;
let frames = 0;
const started = Date.now();
for (;;) {
  const id = await page.evaluate(() => location.hash.slice(1));
  const hold = HOLDS[id] ?? DEFAULT_HOLD;
  const count = Math.round(hold * fps);
  for (let frame = 0; frame < count; frame++) {
    await page.evaluate((milliseconds) => window.__step(milliseconds), frameMs);
    // Lossless frames: JPEG's own 8x8 blocks band smooth gradients.
    const image = await page.screenshot({ type: 'png' });
    if (!ffmpeg.stdin.write(image)) {
      await once(ffmpeg.stdin, 'drain');
    }
    frames++;
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`${id}: ${count} frames (total ${frames}, ${(frames / fps).toFixed(1)}s of video, ${seconds}s elapsed)`);
  if (id === values.to) {
    break;
  }
  await page.keyboard.press('ArrowRight');
}

ffmpeg.stdin.end();
await once(ffmpeg, 'close');
await browser.close();
console.log(`wrote ${values.out}: ${frames} frames at ${fps}fps`);
