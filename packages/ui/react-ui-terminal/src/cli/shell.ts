//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as CliError from 'effect/unstable/cli/CliError';
import * as Command from 'effect/unstable/cli/Command';

import type { TerminalBridge } from './bridge.ts';
import { readLineResult } from './line-editor.ts';
import { rewriteHelpAliases, tokenize } from './tokenize.ts';

const EXIT_COMMANDS = ['exit', 'quit'];

/** The services CLI parsing and execution need. */
export type CliEnvironment = Command.Environment;

export type ShellOptions<Name extends string, Input, ContextInput, E, R> = {
  command: Command.Command<Name, Input, ContextInput, E, R>;
  /** Executable name, used in the prompt. */
  name?: string;
  version?: string;
  prompt?: string;
  banner?: string;
};

/**
 * Runs a read-eval-print loop against an Effect CLI command tree.
 *
 * Each line is tokenized and dispatched through the same `Command.runWith` the binary uses. The
 * command tree and its layer are built once, so every command reuses the already-activated
 * services.
 */
export const runShell = <Name extends string, Input, ContextInput, E, R>(
  bridge: TerminalBridge,
  options: ShellOptions<Name, Input, ContextInput, E, R>,
): Effect.Effect<void, never, R | CliEnvironment> =>
  Effect.gen(function* () {
    const { command, name = 'dx', version = '0.0.0', prompt = `${name}> `, banner } = options;
    const run = Command.runWith(command, { version });
    const history: string[] = [];

    if (banner) {
      bridge.write(`${banner}\n`);
    }

    while (true) {
      if (!bridge.atLineStart) {
        bridge.write('\n');
      }

      const result = yield* readLineResult(bridge, { prompt, history });
      if (result.type === 'eof') {
        break;
      }
      if (result.type === 'cancelled') {
        continue;
      }

      const line = result.value.trim();
      if (line.length === 0) {
        continue;
      }
      if (EXIT_COMMANDS.includes(line)) {
        break;
      }

      history.push(line);
      const tokens = rewriteHelpAliases(tokenize(line));
      if (tokens.length === 0) {
        continue;
      }

      // Failures are reported rather than propagated so the shell survives to the next prompt.
      // CLI errors are skipped because the parser has already rendered them.
      yield* run(tokens).pipe(
        Effect.catchCause((cause) => {
          if (Cause.hasInterruptsOnly(cause)) {
            return Effect.void;
          }

          // A CLI error has already been rendered to stdout by the runner (help, usage), so
          // repeating it as a stack would only be noise.
          const error = Cause.findErrorOption(cause);
          if (Option.isSome(error) && CliError.isCliError(error.value)) {
            return Effect.void;
          }

          return Console.error(Cause.pretty(cause));
        }),
      );
    }

    bridge.write('\n');
  });
