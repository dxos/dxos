//
// Copyright 2025 DXOS.org
//

import { spawn } from 'node:child_process';

import * as Effect from 'effect/Effect';

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
          // Linux - try xclip or xsel
          command = 'xclip';
          args = ['-selection', 'clipboard'];
        }

        const proc = spawn(command, args);
        proc.stdin?.write(text);
        proc.stdin?.end();

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            // Try xsel as fallback on Linux
            if (platform === 'linux') {
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
            } else {
              reject(new Error('Failed to copy to clipboard'));
            }
          }
        });

        proc.on('error', reject);
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
          command = 'start';
          args = [url];
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
