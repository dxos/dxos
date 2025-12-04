//
// Copyright 2025 DXOS.org
//

import readline from 'node:readline/promises';

import * as Effect from 'effect/Effect';

export type MultilinePromptResult = { type: 'input'; value: string } | { type: 'exit' } | { type: 'empty' };

export type MultilinePromptOptions = {
  primaryPrompt?: string;
  continuationPrompt?: string;
  exitCommands?: string[];
};

/**
 * Effect-TS compatible multi-line input prompt.
 * Inspired by OpenCode CLI multi-line input handling.
 */
export const multilinePrompt = (
  options: MultilinePromptOptions = {},
): Effect.Effect<MultilinePromptResult, Error, never> => {
  const { primaryPrompt = '> ', continuationPrompt = '  ', exitCommands = ['quit', 'exit', 'q'] } = options;

  return Effect.gen(function* () {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const lines: string[] = [];
      let firstLine = true;

      // Collect multi-line input until empty line.
      while (true) {
        const line = yield* Effect.tryPromise({
          try: () => rl.question(firstLine ? primaryPrompt : continuationPrompt),
          catch: (error) => new Error(String(error)),
        });

        firstLine = false;

        // Empty line signals end of input.
        if (line === '') {
          break;
        }

        lines.push(line);
      }

      const input = lines.join('\n').trim();

      rl.close();

      if (!input) {
        return { type: 'empty' } as const;
      }

      if (exitCommands.includes(input.toLowerCase())) {
        return { type: 'exit' } as const;
      }

      return { type: 'input', value: input } as const;
    } catch (error) {
      rl.close();
      throw error;
    }
  });
};
