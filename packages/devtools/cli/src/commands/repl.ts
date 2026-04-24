//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { getDispatcher } from '../dispatcher';
import { multilinePrompt } from '../util';

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
      const dispatch = getDispatcher();

      // Mimic the argv that `Command.run` receives from `process.argv`:
      // the first two elements are ignored by the Effect CLI parser, so we
      // just reuse whatever launched this process.
      const argvPrefix: string[] = [process.argv[0] ?? 'bun', process.argv[1] ?? 'dx'];

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

        const tokens = tokenize(result.value);
        if (tokens.length === 0) {
          continue;
        }

        // Dispatch in-process. Command failures are caught so the REPL
        // stays alive for the next prompt.
        yield* dispatch([...argvPrefix, ...tokens]).pipe(
          Effect.catchAllCause((cause) =>
            Cause.isInterruptedOnly(cause)
              ? Effect.void
              : Console.error(Cause.pretty(cause)),
          ),
        );
      }

      yield* Console.log('Goodbye.');
    }) as Effect.Effect<void, unknown, never>,
).pipe(Command.withDescription('Enter a REPL with multi-line input support to interact with the DXOS CLI.'));
