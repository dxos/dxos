//
// Copyright 2026 DXOS.org
//

/**
 * A screencast recorder that keeps the resolution it is given.
 *
 * Playwright's own `recordVideo` pipes frames into its bundled ffmpeg with a fixed VP8 profile —
 * realtime deadline, one thread, `-b:v 1M` — so a larger frame only spreads the same bitrate thinner:
 * text at 2x device pixels comes out smeared. This takes the JPEG frames from `page.screencast` and
 * encodes them with a full ffmpeg to VP9 at a constant quality instead.
 *
 * Frames are written to disk as they arrive and encoded once, on `stop`. Only frames that differ reach
 * us (Chromium's screencast emits on paint), so a still stretch costs one file and the output is
 * variable-frame-rate: an agent-paced session encodes in time proportional to its motion, not its
 * length. `trim-static.mjs` resamples to a constant rate on decode, so it reads this unchanged.
 */

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

/** The Playwright-bundled ffmpeg is stripped of every encoder but VP8, so probe for VP9 rather than for ffmpeg. */
export const hasFullFfmpeg = () => {
  const result = spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.includes('libvpx-vp9');
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ dir: string, file: string, size: { width: number, height: number }, fps: number, crf: number, quality: number }} options
 */
export const startRecorder = async (page, { dir, file, size, fps, crf, quality }) => {
  const framesDir = path.join(dir, 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  let started = Date.now();
  /** `{ file, ms }` per kept frame; `ms` is from `started`, the same clock the caption timeline uses. */
  const frames = [];
  // A counter rather than `frames.length`: after a `cut` the array restarts but earlier files remain, and
  // reusing a name would overwrite the frame the cut kept.
  let written = 0;
  // Frames closer together than one output frame overwrite the last one: during a drag Chromium emits
  // at display rate, and every extra frame is disk and encode time the output rate would discard anyway.
  const minGap = 1000 / fps;

  await page.screencast.start({
    size,
    quality,
    onFrame: ({ data }) => {
      const ms = Date.now() - started;
      const last = frames.at(-1);
      if (last && ms - last.ms < minGap) {
        writeFileSync(last.file, data);
        return;
      }
      const frameFile = path.join(framesDir, `${String(written++).padStart(6, '0')}.jpg`);
      writeFileSync(frameFile, data);
      frames.push({ file: frameFile, ms });
    },
  });

  const stop = async () => {
    const stoppedMs = Date.now() - started;
    await page.screencast.stop();
    if (!frames.length) {
      throw new Error('screencast delivered no frames');
    }

    // The concat demuxer takes each entry's duration from the next entry's start, and ignores the last
    // entry's duration unless the file is listed once more — so the final frame is repeated to hold the
    // tail through `stop` instead of collapsing to one frame.
    frames[0].ms = 0;
    const tail = path.join(framesDir, 'tail.jpg');
    copyFileSync(frames.at(-1).file, tail);
    const entries = [...frames, { file: tail, ms: stoppedMs }];
    const list = ['ffconcat version 1.0'];
    entries.forEach((entry, index) => {
      list.push(`file '${path.basename(entry.file)}'`);
      const next = entries[index + 1];
      if (next) {
        list.push(`duration ${(Math.max(next.ms - entry.ms, 1) / 1000).toFixed(3)}`);
      }
    });
    const listFile = path.join(framesDir, 'frames.ffconcat');
    writeFileSync(listFile, list.join('\n') + '\n');

    const { width, height } = size;
    const encoder = spawn(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listFile,
      // A resize mid-session changes the frame size; every frame is fitted to one canvas so the encoder
      // never sees a size change.
      '-vf',
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      '-fps_mode',
      'vfr',
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
      '-y',
      file,
    ]);
    encoder.stderr.pipe(process.stderr);
    const [code] = await once(encoder, 'close');
    if (code !== 0) {
      throw new Error(`ffmpeg exited ${code}; frames kept in ${framesDir}`);
    }
    rmSync(framesDir, { recursive: true, force: true });
    return { file, frames: frames.length, seconds: stoppedMs / 1000 };
  };

  /**
   * Discards everything recorded so far — app boot, setup — and restarts the clock. The last frame is
   * kept as the new first one so the video opens on the screen as it stands, not on black.
   */
  const cut = () => {
    const last = frames.at(-1);
    frames.length = 0;
    started = Date.now();
    if (last) {
      frames.push({ file: last.file, ms: 0 });
    }
    return started;
  };

  return {
    get started() {
      return started;
    },
    cut,
    stop,
  };
};
