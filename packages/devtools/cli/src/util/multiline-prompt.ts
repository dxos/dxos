//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import readline from 'node:readline';

export type MultilinePromptResult = { type: 'input'; value: string } | { type: 'exit' } | { type: 'empty' };

export type MultilinePromptOptions = {
  primaryPrompt?: string;
  continuationPrompt?: string;
  exitCommands?: string[];
};

/**
 * Lazily create a shared readline interface and line-queue for the process.
 * `readline.question()`'s promise API drops line events that arrive between
 * questions, which breaks multi-line piped input. Instead we subscribe to
 * `'line'` once and buffer arrivals into a FIFO; `nextLine()` either pops
 * from the buffer or awaits the next event (or close).
 */
type LineReader = {
  nextLine(prompt: string): Promise<string | null>; // null on EOF
  close(): void;
};

const createLineReader = (): LineReader => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const buffered: string[] = [];
  const waiters: Array<(value: string | null) => void> = [];
  let closed = false;

  rl.on('line', (line) => {
    const waiter = waiters.shift();
    if (waiter) {
      waiter(line);
    } else {
      buffered.push(line);
    }
  });

  rl.on('close', () => {
    closed = true;
    while (waiters.length > 0) {
      waiters.shift()!(null);
    }
  });

  return {
    nextLine(prompt: string): Promise<string | null> {
      if (buffered.length > 0) {
        return Promise.resolve(buffered.shift()!);
      }
      if (closed) {
        return Promise.resolve(null);
      }
      // Write the prompt manually — we are not using rl.question.
      process.stdout.write(prompt);
      return new Promise((resolvePromise) => waiters.push(resolvePromise));
    },
    close() {
      if (!closed) {
        rl.close();
      }
    },
  };
};

/**
 * Effect-TS compatible single-line prompt with optional shell-style line
 * continuation. Press Enter to submit; end a line with `\` to continue on
 * the next line (the trailing `\` is stripped). Exits cleanly on EOF or
 * when the user enters one of the configured exit commands.
 */
export const multilinePrompt = (
  options: MultilinePromptOptions = {},
): Effect.Effect<MultilinePromptResult, Error, never> => {
  const { primaryPrompt = '> ', continuationPrompt = '  ', exitCommands = ['quit', 'exit', 'q'] } = options;

  return Effect.gen(function* () {
    const reader = createLineReader();

    try {
      const lines: string[] = [];
      let firstLine = true;

      while (true) {
        const line = yield* Effect.tryPromise({
          try: () => reader.nextLine(firstLine ? primaryPrompt : continuationPrompt),
          catch: (error) => new Error(String(error)),
        });

        if (line === null) {
          // stdin closed — treat as clean exit.
          return { type: 'exit' } as const;
        }

        // Trailing backslash signals continuation. Strip it and keep reading.
        if (line.endsWith('\\')) {
          lines.push(line.slice(0, -1));
          firstLine = false;
          continue;
        }

        lines.push(line);
        break;
      }

      const input = lines.join('\n').trim();

      if (!input) {
        return { type: 'empty' } as const;
      }

      if (exitCommands.includes(input.toLowerCase())) {
        return { type: 'exit' } as const;
      }

      return { type: 'input', value: input } as const;
    } finally {
      reader.close();
    }
  });
};
