//
// Copyright 2026 DXOS.org
//

/**
 * Records an X display, for a native window that has no screencast of its own to tap.
 *
 * `recorder.mjs` takes Chromium's screencast frames; a Tauri webview has none, so this grabs the screen
 * the app runs on instead. The capture is encoded losslessly-fast to H.264 while it runs, since a realtime
 * VP9 encode would compete with the app for the CPU it renders on, and transcoded to VP9 once, on `stop`,
 * from the last `cut` onward. The interface is `recorder.mjs`'s, so `driver.mjs` treats both alike.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { rmSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

/**
 * @param {{ display: string, dir: string, file: string, size: { width: number, height: number }, fps: number, crf: number }} options
 */
export const startX11Recorder = async ({ display, dir, file, size, fps, crf }) => {
  const capture = path.join(dir, 'capture.mkv');
  rmSync(capture, { force: true });
  const grab = spawn(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'x11grab',
      // The overlay paints its own cursor; the X pointer never moves under WebDriver input anyway.
      '-draw_mouse',
      '0',
      '-framerate',
      String(fps),
      '-video_size',
      `${size.width}x${size.height}`,
      '-i',
      `${display}+0,0`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '10',
      '-y',
      capture,
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  );
  const origin = Date.now();
  let started = origin;
  let exited = false;
  grab.on('exit', () => {
    exited = true;
  });

  const stop = async () => {
    const stoppedMs = Date.now() - started;
    if (!exited) {
      // `q` lets ffmpeg finish the file; a signal would leave the container unterminated.
      grab.stdin.write('q');
      grab.stdin.end();
      await once(grab, 'exit');
    }
    const encoder = spawn(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      ((started - origin) / 1000).toFixed(3),
      '-i',
      capture,
      '-vf',
      'format=yuv420p',
      '-c:v',
      'libvpx-vp9',
      '-crf',
      String(crf),
      '-b:v',
      '0',
      '-row-mt',
      '1',
      // Realtime speed: a 2x screen grab is large, and the trimmer re-encodes it at quality anyway.
      '-deadline',
      'realtime',
      '-cpu-used',
      '8',
      '-y',
      file,
    ]);
    encoder.stderr.pipe(process.stderr);
    const [code] = await once(encoder, 'close');
    if (code !== 0) {
      throw new Error(`ffmpeg exited ${code}; the raw capture is kept at ${capture}`);
    }
    rmSync(capture, { force: true });
    return { file, seconds: stoppedMs / 1000 };
  };

  /** Everything before now is dropped on `stop`; the clock the captions use restarts here. */
  const cut = () => {
    started = Date.now();
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
