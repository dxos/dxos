//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientFree } from '@dxos/cli-util';
import { ClientInitialization } from '@dxos/client';

/** Flags that stop a command from running its handler, so it never needs the client. */
const NON_RUNNING_FLAGS = new Set(['--help', '-h', '--version', '--wizard', '--completions']);

/**
 * The chain of commands `argv` selects, root first: each non-flag token that names (or aliases) a
 * subcommand of the current command descends into it. Flag values are skipped by not matching.
 */
export const selectCommandPath = (root: Command.Command.Any, argv: readonly string[]): Command.Command.Any[] => {
  const path: Command.Command.Any[] = [root];
  let current = root;
  for (const token of argv) {
    if (token === '--') {
      break;
    }
    if (token.startsWith('-') || current.subcommands.length === 0) {
      continue;
    }
    const next = current.subcommands
      .flatMap(({ commands }) => commands)
      .find((command) => command.name === token || command.alias === token);
    if (next) {
      path.push(next);
      current = next;
    }
  }
  return path;
};

/**
 * Whether running `argv` must first wait for the client: only a leaf command's handler can use it,
 * and a command annotated {@link ClientFree} (or nested under one) resolves the client itself when it needs one.
 */
export const needsClient = (root: Command.Command.Any, argv: readonly string[]): boolean => {
  if (argv.some((token) => NON_RUNNING_FLAGS.has(token.split('=')[0]))) {
    return false;
  }
  const path = selectCommandPath(root, argv);
  const leaf = path[path.length - 1];
  if (leaf.subcommands.length > 0) {
    return false;
  }
  return !path.some((command) => Context.get(command.annotations, ClientFree));
};

/**
 * Waits for the client before `argv` runs, when the selected command needs it; `onInitialized` runs
 * once the wait succeeds. A host that provides no {@link ClientInitialization} runs the command at once.
 */
export const awaitClientFor = (
  root: Command.Command.Any,
  argv: readonly string[],
  onInitialized: Effect.Effect<void> = Effect.void,
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    if (!needsClient(root, argv)) {
      return;
    }
    const initialization = yield* Effect.serviceOption(ClientInitialization);
    if (Option.isSome(initialization)) {
      yield* initialization.value;
      yield* onInitialized;
    }
  });

/**
 * Runs `command` on `argv`, first waiting for the client only when the selected command needs it,
 * so a command that never uses the client neither waits for its initialization nor fails with it.
 */
export const runWithClientGate =
  <const Name extends string, Input, E, R, ContextInput>(
    command: Command.Command<Name, Input, ContextInput, E, R>,
    config: { readonly version: string },
    onInitialized?: Effect.Effect<void>,
  ) =>
  (argv: readonly string[]) =>
    awaitClientFor(command, argv, onInitialized).pipe(Effect.andThen(Command.runWith(command, config)(argv)));
