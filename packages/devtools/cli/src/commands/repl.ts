//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { getDispatcher } from '../dispatcher';
import { closeLineReader, multilinePrompt } from '../util';

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

/**
 * Translates REPL-friendly aliases to their Effect-CLI equivalents. The
 * Effect CLI uses `--help` rather than a `help` subcommand, but `help` and
 * `?` are the natural things to type in a REPL.
 */
const rewriteHelpAliases = (tokens: string[]): string[] => {
  if (tokens.length === 0) {
    return tokens;
  }
  // Bare `help` / `?` → top-level `--help`.
  if (tokens.length === 1 && (tokens[0] === 'help' || tokens[0] === '?')) {
    return ['--help'];
  }
  // `help foo bar` / `? foo bar` → `foo bar --help`.
  if (tokens[0] === 'help' || tokens[0] === '?') {
    return [...tokens.slice(1), '--help'];
  }
  return tokens;
};

export const repl = Command.make(
  'repl',
  {},
  (): Effect.Effect<void, unknown, never> =>
    Effect.gen(function* () {
      const dispatch = getDispatcher();

      // Mimic the argv that `Command.run` receives from `process.argv`:
      // the first two elements are ignored by the Effect CLI parser, so we
      // just reuse whatever launched this process.
      const argvPrefix: string[] = [process.argv[0] ?? 'bun', process.argv[1] ?? 'dx'];

      yield* Console.log('DXOS Interactive Shell');
      yield* Console.log('Enter a `dx` command (end a line with `\\` to continue on the next line).');
      yield* Console.log('Type "help" or "?" for the command list, "quit" / "exit" / "q" to exit.\n');

      try {
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

          const tokens = rewriteHelpAliases(tokenize(result.value));
          if (tokens.length === 0) {
            continue;
          }

          // Dispatch in-process. Command failures are caught so the REPL
          // stays alive for the next prompt.
          yield* dispatch([...argvPrefix, ...tokens]).pipe(
            Effect.catchAllCause((cause) =>
              Cause.isInterruptedOnly(cause) ? Effect.void : Console.error(Cause.pretty(cause)),
            ),
          );
        }

        yield* Console.log('Goodbye.');
      } finally {
        closeLineReader();
      }
    }) as Effect.Effect<void, unknown, never>,
).pipe(Command.withDescription('Enter an interactive REPL to dispatch DXOS CLI commands in-process.'));
