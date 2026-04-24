//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { multilinePrompt } from '../util';

/** Resolves the `bin/dx` wrapper relative to this file so the child process inherits the same dev/source-mode setup. */
const resolveBinDx = (): string => {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), '..', '..', 'bin', 'dx');
};

/**
 * Splits a raw input line into argv tokens. Supports single/double-quoted
 * segments so quoted strings with spaces survive. Intentionally simple — if
 * users need complex shell features they can drop out of the REPL.
 */
const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
};

export const repl = Command.make(
  'repl',
  {},
  (): Effect.Effect<void, unknown, never> =>
    Effect.gen(function* () {
      const binDx = resolveBinDx();

      yield* Console.log('DXOS Interactive Shell');
      yield* Console.log('Enter a `dx` command (multi-line supported — press Enter twice to submit).');
      yield* Console.log('Type "quit", "exit", or "q" to exit.\n');

      while (true) {
        const result = yield* multilinePrompt({
          primaryPrompt: 'dx> ',
          continuationPrompt: '... ',
        });

        if (result.type === 'exit') {
          break;
        }

        if (result.type === 'empty') {
          continue;
        }

        const argv = tokenize(result.value);
        if (argv.length === 0) {
          continue;
        }

        yield* Effect.tryPromise({
          try: async () => {
            const proc = Bun.spawn([binDx, ...argv], {
              stdin: 'inherit',
              stdout: 'inherit',
              stderr: 'inherit',
            });
            await proc.exited;
            if (proc.exitCode !== 0) {
              // Keep the REPL alive on non-zero exits so the user can retry.
              console.error(`(exit code ${proc.exitCode})`);
            }
          },
          catch: (cause) => new Error(`Failed to dispatch command: ${String(cause)}`),
        }).pipe(Effect.catchAll((error) => Console.error(String(error))));
      }

      yield* Console.log('Goodbye.');
    }) as Effect.Effect<void, unknown, never>,
).pipe(Command.withDescription('Enter a REPL with multi-line input support to interact with the DXOS CLI.'));
