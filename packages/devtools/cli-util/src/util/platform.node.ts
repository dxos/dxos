//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { spawn } from 'node:child_process';

/**
 * Copy text to the system clipboard.
 * Supports macOS (pbcopy), Windows (clip), and Linux (xclip/xsel).
 */
export const copyToClipboard = (text: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => {
      return new Promise<void>((resolve, reject) => {
        const platform = process.platform;
        let command: string;
        let args: string[];

        if (platform === 'darwin') {
          command = 'pbcopy';
          args = [];
        } else if (platform === 'win32') {
          command = 'clip';
          args = [];
        } else {
          // Linux, where either xclip or xsel may be the one installed.
          command = 'xclip';
          args = ['-selection', 'clipboard'];
        }

        // Reached from both failure paths: a missing xclip emits 'error' and never closes, so
        // rejecting there directly would skip the fallback on exactly the machines that need it.
        const fallback = () => {
          if (platform !== 'linux') {
            reject(new Error('Failed to copy to clipboard'));
            return;
          }

          const proc2 = spawn('xsel', ['--clipboard', '--input']);
          proc2.stdin?.write(text);
          proc2.stdin?.end();
          proc2.on('close', (code2) => {
            if (code2 === 0) {
              resolve();
            } else {
              reject(new Error('Failed to copy to clipboard'));
            }
          });
          proc2.on('error', reject);
        };

        const proc = spawn(command, args);
        proc.stdin?.write(text);
        proc.stdin?.end();

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            fallback();
          }
        });

        proc.on('error', fallback);
      });
    },
    catch: (error) => new Error(`Failed to copy to clipboard: ${error}`),
  });

/**
 * Open a URL in the system's default browser.
 * Supports macOS (open), Windows (start), and Linux (xdg-open).
 */
export const openBrowser = (url: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => {
      return new Promise<void>((resolve, reject) => {
        const platform = process.platform;
        let command: string;
        let args: string[];

        if (platform === 'darwin') {
          command = 'open';
          args = [url];
        } else if (platform === 'win32') {
          // `start` is a cmd.exe builtin rather than an executable, so spawning it directly is
          // ENOENT; the empty title argument keeps a URL from being read as the window title.
          command = 'cmd.exe';
          args = ['/c', 'start', '', url];
        } else {
          command = 'xdg-open';
          args = [url];
        }

        const proc = spawn(command, args);
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Failed to open browser'));
          }
        });
        proc.on('error', reject);
      });
    },
    catch: (error) => new Error(`Failed to open browser: ${error}`),
  });
