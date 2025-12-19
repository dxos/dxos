//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { multilinePrompt } from '../util/multiline-prompt';

import { run } from './dx';

const args = (cmd: string) => [__filename, 'dx', ...cmd.split(' ')];

// TODO(wittjosiah): The cycle causes `run` to lose a bunch of type information.
export const repl = Command.make(
  'repl',
  {},
  (): Effect.Effect<void, unknown, never> =>
    Effect.gen(function* () {
      yield* Console.log('DXOS Interactive Shell (Next-gen)');
      yield* Console.log('Enter commands (multi-line supported). Press Enter twice to submit.');
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

        yield* run(args(result.value));
      }
    }) as Effect.Effect<void, unknown, never>,
).pipe(Command.withDescription('Enter a REPL with multi-line input support to interact with the DXOS CLI.'));
