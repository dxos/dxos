//
// Copyright 2025 DXOS.org
//

import { Command, Prompt } from '@effect/cli';
import * as Effect from 'effect/Effect';

import { run } from './dx';

const args = (cmd: string) => [__filename, 'dx', ...cmd.split(' ')];

// TODO(wittjosiah): The cycle causes `run` to lose a bunch of type information.
export const repl = Command.make(
  'repl',
  {},
  (): Effect.Effect<void, unknown, never> =>
    Effect.gen(function* () {
      while (true) {
        const rawCommand = yield* Prompt.text({ message: '' }).pipe(Prompt.run);
        if (rawCommand === 'quit' || rawCommand === 'q') {
          break;
        }
        yield* run(args(rawCommand));
      }
    }) as Effect.Effect<void, unknown, never>,
).pipe(Command.withDescription('Enter a REPL to interact with the DXOS CLI.'));
