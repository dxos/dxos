//
// Copyright 2026 DXOS.org
//

/**
 * Renders the GridZoom story frame by frame at an exact rate: each frame seeks the stepped story to its time, then
 * screenshots it into ffmpeg. A live screencast delivers about 25 frames a second at 1080p, which makes a camera
 * move judder however the result is re-encoded.
 *
 *   node render.mjs [--out composite.mp4] [--fps 60] [--url http://localhost:9015] [--theme light]
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'composite.mp4' },
    fps: { type: 'string', default: '60' },
    url: { type: 'string', default: 'http://localhost:9015' },
    theme: { type: 'string', default: 'light' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
  },
});

const fps = Number(values.fps);
const size = { width: Number(values.width), height: Number(values.height) };
const url =
  `${values.url}/iframe.html?id=tools-autocue-gridzoom--default&viewMode=story` +
  `&args=controls:!false;stepped:!true&globals=theme:${values.theme}`;

// Full Chromium's headless mode has the GPU; the default headless shell renders WebGL in software.
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const page = await browser.newPage({ viewport: size, colorScheme: values.theme === 'dark' ? 'dark' : 'light' });
await page.goto(url);
await page.waitForFunction(() => window.gridZoom !== undefined, undefined, { timeout: 120_000 });
await page.waitForFunction(
  () => {
    const videos = [...document.querySelectorAll('video')];
    return videos.length > 0 && videos.every((video) => video.readyState >= 2);
  },
  undefined,
  { timeout: 120_000 },
);
const total = await page.evaluate(() => window.gridZoom.total);
const frames = Math.ceil((total / 1_000) * fps);
console.log(`rendering ${frames} frames (${(total / 1_000).toFixed(1)}s at ${fps} fps) to ${values.out}`);

const ffmpeg = spawn(
  process.env.FFMPEG_PATH ?? 'ffmpeg',
  [
    ...['-hide_banner', '-loglevel', 'error', '-y'],
    ...['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'],
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
    await page.evaluate((ms) => window.gridZoom.seek(ms), (frame * 1_000) / fps);
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
