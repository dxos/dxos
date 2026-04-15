//
// Copyright 2026 DXOS.org
//

/**
 * Start a macOS screen recording in the background. Uses the built-in
 * `screencapture` so no extra dependency is needed, at the cost of requiring
 * Screen Recording permission for Terminal / iTerm.
 *
 * Returns a handle with `stop()` that flushes the file to disk.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const RECORDINGS_DIR = resolve(DEMO_DIR, '..', 'recordings');

export type RecordingHandle = {
  readonly file: string;
  readonly stop: () => Promise<void>;
};

/**
 * Kick off a screen recording of the primary display. `screencapture -v`
 * records video; SIGINT to stop cleanly (default flag behavior).
 */
export const startScreenRecording = (): RecordingHandle => {
  mkdirSync(RECORDINGS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(RECORDINGS_DIR, `demo-${timestamp}.mov`);

  // -v: video. -x: no sound from speakers. -R <x,y,w,h> would restrict to a
  // rect, but we want the whole display for now.
  const child: ChildProcess = spawn('screencapture', ['-v', '-x', file], { stdio: 'ignore' });

  const stop = async (): Promise<void> => {
    if (child.killed) {
      return;
    }
    // screencapture exits cleanly on SIGINT, flushing the file.
    child.kill('SIGINT');
    await new Promise<void>((resolveFn) => {
      if (child.exitCode !== null) {
        resolveFn();
        return;
      }
      child.once('exit', () => resolveFn());
    });
  };

  return { file, stop };
};
