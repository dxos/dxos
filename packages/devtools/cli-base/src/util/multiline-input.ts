//
// Copyright 2025 DXOS.org
//

import readline from 'node:readline/promises';

export type MultilineInputOptions = {
  /**
   * The prompt prefix for the first line of input.
   * @default '> '
   */
  primaryPrompt?: string;

  /**
   * The prompt prefix for continuation lines.
   * @default '  '
   */
  continuationPrompt?: string;

  /**
   * Custom message shown before starting input collection.
   */
  welcomeMessage?: string;

  /**
   * Whether to show instructions on how to submit input.
   * @default true
   */
  showInstructions?: boolean;

  /**
   * Commands that will exit the REPL.
   * @default ['quit', 'exit', 'q']
   */
  exitCommands?: string[];
};

export type MultilineInputResult = { type: 'input'; value: string } | { type: 'exit' } | { type: 'empty' };

/**
 * Collects multi-line input from the user.
 * User presses Enter twice (empty line) to submit the input.
 *
 * Inspired by OpenCode CLI multi-line input handling.
 *
 * @example
 * ```typescript
 * const rl = readline.createInterface({
 *   input: process.stdin,
 *   output: process.stdout,
 * });
 *
 * while (true) {
 *   const result = await collectMultilineInput(rl);
 *   if (result.type === 'exit') {
 *     break;
 *   }
 *   if (result.type === 'input') {
 *     console.log('You entered:', result.value);
 *   }
 * }
 *
 * rl.close();
 * ```
 */
export const collectMultilineInput = async (
  rl: readline.Interface,
  options: MultilineInputOptions = {},
): Promise<MultilineInputResult> => {
  const { primaryPrompt = '> ', continuationPrompt = '  ', exitCommands = ['quit', 'exit', 'q'] } = options;

  const lines: string[] = [];
  let firstLine = true;

  // Collect multi-line input until empty line.
  while (true) {
    const line = await rl.question(firstLine ? primaryPrompt : continuationPrompt);
    firstLine = false;

    // Empty line signals end of input.
    if (line === '') {
      break;
    }

    lines.push(line);
  }

  const input = lines.join('\n').trim();

  if (!input) {
    return { type: 'empty' };
  }

  if (exitCommands.includes(input.toLowerCase())) {
    return { type: 'exit' };
  }

  return { type: 'input', value: input };
};

/**
 * Creates a REPL with multi-line input support.
 *
 * @example
 * ```typescript
 * await createMultilineRepl({
 *   welcomeMessage: 'Welcome to my REPL!',
 *   onInput: async (input) => {
 *     console.log('Processing:', input);
 *     // Process the input here.
 *   },
 * });
 * ```
 */
export const createMultilineRepl = async (options: {
  welcomeMessage?: string;
  showInstructions?: boolean;
  onInput: (input: string) => Promise<void>;
  onError?: (error: Error) => void;
  inputOptions?: MultilineInputOptions;
}): Promise<void> => {
  const { welcomeMessage, showInstructions = true, onInput, onError, inputOptions = {} } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (welcomeMessage) {
    console.log(welcomeMessage);
  }

  if (showInstructions) {
    console.log('Enter your input (multi-line supported). Press Enter twice to submit.');
    console.log('Type "quit", "exit", or "q" and press Enter twice to quit.\n');
  }

  while (true) {
    try {
      const result = await collectMultilineInput(rl, inputOptions);

      if (result.type === 'exit') {
        break;
      }

      if (result.type === 'empty') {
        continue;
      }

      await onInput(result.value);
      console.log(); // Extra newline after processing.
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
        break;
      }

      if (onError) {
        onError(error as Error);
      } else {
        console.error('Error:', error instanceof Error ? error.message : error);
      }
    }
  }

  rl.close();
};
