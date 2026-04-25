//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * In-process command dispatcher.
 *
 * Registered by `bin.ts` after the root command and plugin layer have been
 * built. The REPL uses this to re-enter the CLI without spawning a new
 * `bun` process per keystroke — every command reuses the already-activated
 * plugin layer, which saves several seconds of DXOS startup cost per
 * command.
 *
 * The alternative (spawning `./bin/dx` as a child process) is simpler and
 * always correct, but slow and noisy; see the previous iteration of the
 * REPL handler for reference.
 */
export type Dispatcher = (argv: string[]) => Effect.Effect<void, unknown, never>;

let _dispatcher: Dispatcher | undefined;

/**
 * Registers the in-process dispatcher. Called once from `bin.ts`.
 */
export const setDispatcher = (dispatcher: Dispatcher): void => {
  _dispatcher = dispatcher;
};

/**
 * Returns the registered dispatcher, or throws if `setDispatcher` has not
 * been called yet (which should never happen in a well-formed CLI startup).
 */
export const getDispatcher = (): Dispatcher => {
  if (!_dispatcher) {
    throw new Error('CLI dispatcher has not been initialized.');
  }
  return _dispatcher;
};
