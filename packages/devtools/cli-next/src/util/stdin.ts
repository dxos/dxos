//
// Copyright 2025 DXOS.org
//

import readline from 'node:readline';

import * as Effect from 'effect/Effect';

const STDIN_TIMEOUT = 100;

/**
 * Read from stdin using Effect.
 * Returns the input as a string, or empty string if no input is available within the timeout.
 */
export const readStdin = (): Effect.Effect<string, Error> => {
  return Effect.tryPromise({
    try: () =>
      new Promise<string>((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: process.stdin.isTTY,
        });

        const inputLines: string[] = [];
        rl.on('line', (line) => inputLines.push(line));
        rl.on('close', () => resolve(inputLines.join('\n')));
        setTimeout(() => rl.close(), STDIN_TIMEOUT);
      }),
    catch: (error) => new Error(`Failed to read from stdin: ${error}`),
  });
};
