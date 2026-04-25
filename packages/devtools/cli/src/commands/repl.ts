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

/**
 * Filters background timeout warnings out of stderr while the REPL is alive
 * so they don't bleed into the prompt. The warnings come from
 * `warnAfterTimeout` in @dxos/debug — they fire when plugin layer activation
 * (e.g. eager space initialisation in ClientPlugin) takes longer than its
 * threshold, which is normal during REPL idle.
 *
 * Returns a restore function that the REPL must call on exit.
 *
 * NOTE: the regex intentionally anchors on a stable prefix only — the full
 * message wording in @dxos/debug may be reworded without breaking the
 * filter. Any subsequent indented stack-trace lines are also dropped, which
 * may incidentally swallow unrelated indented stderr that arrives in the
 * same microtask; low-probability and acceptable for REPL noise.
 */
const installStderrFilter = (): (() => void) => {
  const originalWrite = process.stderr.write.bind(process.stderr);
  const TIMEOUT_WARNING_PREFIX_RE = /^Action `[^`]+` is taking more/;
  let suppressing = false;

  // process.stderr.write has multiple overloads; we cast to the broad form.
  // Node's stream.write contract accepts an optional callback as the final
  // argument. We MUST invoke it even when suppressing to avoid hanging any
  // caller that awaits flush completion.
  (process.stderr as any).write = (chunk: any, ...rest: any[]): boolean => {
    const maybeCallback = rest[rest.length - 1];
    const callback: ((err?: Error | null) => void) | undefined =
      typeof maybeCallback === 'function' ? (maybeCallback as any) : undefined;
    const text = typeof chunk === 'string' ? chunk : (chunk?.toString?.() ?? '');
    // Stack trace lines follow the warning message — keep dropping until we
    // hit a non-indented line.
    if (suppressing) {
      if (/^\s/.test(text) || text.trim() === '') {
        callback?.();
        return true;
      }
      suppressing = false;
    }
    if (TIMEOUT_WARNING_PREFIX_RE.test(text)) {
      suppressing = true;
      callback?.();
      return true;
    }
    return originalWrite(chunk, ...rest);
  };

  return () => {
    (process.stderr as any).write = originalWrite;
  };
};

export const repl = Command.make(
  'repl',
  {},
  (): Effect.Effect<void, unknown, never> =>
    Effect.gen(function* () {
      const dispatch = getDispatcher();
      const restoreStderr = installStderrFilter();

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
        restoreStderr();
        closeLineReader();
      }
    }) as Effect.Effect<void, unknown, never>,
).pipe(Command.withDescription('Enter an interactive REPL to dispatch DXOS CLI commands in-process.'));
