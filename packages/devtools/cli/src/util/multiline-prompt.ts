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
 * Module-scoped line reader: one `readline.Interface` + one FIFO buffer per
 * process, shared across every `multilinePrompt` call. `readline.question`'s
 * promise API drops line events that arrive between questions, which breaks
 * piped multi-line input. Subscribing once and buffering arrivals fixes that,
 * but the buffer MUST outlive any single prompt — a per-call reader would
 * lose queued lines when it closes at the end of each prompt.
 *
 * The reader stays alive until the owner explicitly calls `closeLineReader()`
 * (the REPL does this on exit).
 */
type LineReader = {
  nextLine(prompt: string): Promise<string | null>; // null on EOF
};

let sharedReader: LineReader | undefined;
let sharedInterface: readline.Interface | undefined;

const getLineReader = (): LineReader => {
  if (sharedReader) {
    return sharedReader;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  sharedInterface = rl;

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

  sharedReader = {
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
  };

  return sharedReader;
};

/**
 * Closes the shared readline interface. Call this when the owning REPL
 * exits so the process can terminate cleanly.
 */
export const closeLineReader = (): void => {
  sharedInterface?.close();
  sharedInterface = undefined;
  sharedReader = undefined;
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
    const reader = getLineReader();

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
  });
};
