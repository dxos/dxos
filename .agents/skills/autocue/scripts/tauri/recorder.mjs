//
// Copyright 2026 DXOS.org
//

/**
 * Records a native window, which has no screencast of its own to tap.
 *
 * `recorder.mjs` takes Chromium's screencast frames; a Tauri webview has none. On Linux the app runs on its own
 * X display, which ffmpeg grabs. On macOS a screen grab needs the Screen Recording permission, so the frames
 * are the webview's own snapshots, taken through WebDriver. Either way the capture is encoded fast to H.264
 * while it runs, since a realtime VP9 encode would compete with the app for the CPU it renders on, and
 * transcoded to VP9 once, on `stop`, from the last `cut` onward. The interface is `recorder.mjs`'s, so
 * `driver.mjs` treats all of them alike.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { rmSync } from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The fast H.264 intermediate both recorders write while the session runs. */
const INTERMEDIATE = ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '10', '-y'];

/**
 * Wraps a running capture (an ffmpeg writing `capture`, whose first frame is at `origin`) as the driver's recorder:
 * `cut` moves the start, and `stop` ends the capture through `finish` and transcodes from the start to `file`.
 */
const asRecorder = ({ capture, file, size, crf, finish, origin = Date.now() }) => {
  let started = origin;

  const stop = async () => {
    const stoppedMs = Date.now() - started;
    await finish();
    const encoder = spawn(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      ((started - origin) / 1000).toFixed(3),
      '-i',
      capture,
      // Snapshots come at the display's backing scale, which need not be the scale asked for.
      '-vf',
      `scale=${size.width}:${size.height}:flags=lanczos,format=yuv420p`,
      '-c:v',
      'libvpx-vp9',
      '-crf',
      String(crf),
      '-b:v',
      '0',
      '-row-mt',
      '1',
      // Realtime speed: a 2x capture is large, and the trimmer re-encodes it at quality anyway.
      '-deadline',
      'realtime',
      '-cpu-used',
      '8',
      '-y',
      file,
    ]);
    encoder.stderr.pipe(process.stderr);
    encoder.on('error', (error) => console.error(`encoder failed: ${error.message}`));
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

/** Ends an ffmpeg that reads its commands from stdin: `q` lets it finish the file, where a signal would not. */
const quit = async (child, exited) => {
  if (!exited()) {
    child.stdin.write('q');
    child.stdin.end();
    await once(child, 'exit');
  }
};

/**
 * Grabs an X display.
 *
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
      ...INTERMEDIATE,
      capture,
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  );
  let exited = false;
  grab.on('exit', () => {
    exited = true;
  });
  // A missing ffmpeg or x11grab is a recording lost, not a reason to take the driver down with it.
  grab.on('error', (error) => {
    exited = true;
    console.error(`x11grab failed: ${error.message}`);
  });

  return asRecorder({ capture, file, size, crf, finish: () => quit(grab, () => exited) });
};

/**
 * Records from snapshots: `snapshot` answers a PNG of the webview, and each one is held until the next arrives,
 * so the video runs at a steady `fps` whatever the snapshot rate. A snapshot occupies the app's main thread, so
 * the next is not requested until the main thread has had as long again to itself.
 *
 * @param {{ snapshot: () => Promise<Buffer>, dir: string, file: string, size: { width: number, height: number }, fps: number, crf: number }} options
 */
export const startSnapshotRecorder = async ({ snapshot, dir, file, size, fps, crf }) => {
  const capture = path.join(dir, 'capture.mkv');
  rmSync(capture, { force: true });
  const encode = spawn(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-i',
      '-',
      ...INTERMEDIATE,
      capture,
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  );
  let exited = false;
  encode.on('exit', () => {
    exited = true;
  });
  encode.on('error', (error) => {
    exited = true;
    console.error(`snapshot encoder failed: ${error.message}`);
  });
  // A write after ffmpeg has gone would otherwise surface as an unhandled EPIPE.
  encode.stdin.on('error', () => {});

  const origin = Date.now();
  let latest;
  let written = 0;
  let stopping = false;

  /** Writes the latest frame as often as the clock says is due, so frame N is always at N / fps seconds. */
  const pump = () => {
    if (!latest || exited) {
      return;
    }
    const due = Math.floor(((Date.now() - origin) * fps) / 1000);
    for (; written < due; written++) {
      encode.stdin.write(latest);
    }
  };
  const timer = setInterval(pump, 1000 / fps);

  const grab = (async () => {
    let failures = 0;
    while (!stopping) {
      const begin = Date.now();
      try {
        latest = await snapshot();
        failures = 0;
      } catch (error) {
        // A navigation can fail a snapshot or two; a webview that never answers is a recording lost.
        if (++failures === 20) {
          console.error(`snapshots keep failing: ${error.message}`);
        }
      }
      const took = Date.now() - begin;
      await sleep(Math.max(1000 / fps - took, took));
    }
  })();

  const finish = async () => {
    stopping = true;
    await grab;
    clearInterval(timer);
    pump();
    if (!exited) {
      encode.stdin.end();
      await once(encode, 'exit');
    }
  };

  return asRecorder({ capture, file, size, crf, finish, origin });
};
