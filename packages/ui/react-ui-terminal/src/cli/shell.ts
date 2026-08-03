//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as ValidationError from '@effect/cli/ValidationError';
import type * as FileSystem from '@effect/platform/FileSystem';
import type * as Path from '@effect/platform/Path';
import type * as Terminal from '@effect/platform/Terminal';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import type { TerminalBridge } from './bridge';
import { readLineResult } from './line-editor';
import { rewriteHelpAliases, tokenize } from './tokenize';

const EXIT_COMMANDS = ['exit', 'quit'];

/**
 * The services `Command.run` itself needs, spelled out because `@effect/cli` only exposes the
 * equivalent alias inside its `CliApp` namespace.
 */
export type CliEnvironment = FileSystem.FileSystem | Path.Path | Terminal.Terminal;

export type ShellOptions<Name extends string, R, E, A> = {
  command: Command.Command<Name, R, E, A>;
  /**
   * Executable name, used in help output and as the argv[1] the Effect CLI parser skips.
   */
  name?: string;
  version?: string;
  prompt?: string;
  banner?: string;
};

/**
 * Runs a read-eval-print loop against an `@effect/cli` command tree.
 *
 * Each line is tokenized and dispatched through the same `Command.run` the binary uses, with a
 * synthetic argv prefix standing in for the two leading entries the parser discards. The command
 * tree and its layer are built once, so every command reuses the already-activated services.
 */
export const runShell = <Name extends string, R, E, A>(
  bridge: TerminalBridge,
  options: ShellOptions<Name, R, E, A>,
): Effect.Effect<void, never, R | CliEnvironment> =>
  Effect.gen(function* () {
    const { command, name = 'dx', version = '0.0.0', prompt = `${name}> `, banner } = options;
    const run = Command.run(command, { name, version });
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
      // Validation errors are skipped because the Effect CLI has already rendered them.
      yield* run([name, name, ...tokens]).pipe(
        Effect.catchAllCause((cause) => {
          if (Cause.isInterruptedOnly(cause)) {
            return Effect.void;
          }

          const failure = Cause.failureOption(cause);
          if (failure._tag === 'Some' && ValidationError.isValidationError(failure.value)) {
            return Effect.void;
          }

          return Console.error(Cause.pretty(cause));
        }),
      );
    }

    bridge.write('\n');
  });
