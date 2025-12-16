//
// Copyright 2025 DXOS.org
//

import { ConsolePosition } from '@opentui/core';
import { render } from '@opentui/solid';
import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { type JSX } from 'solid-js';

import { App } from '../components';
import { theme } from '../theme';

import { type LogBuffer } from './log-buffer';

export type RenderAppOptions = {
  /**
   * The custom UI component to render inside the App wrapper.
   */
  children: () => JSX.Element;
  /**
   * Elements that can receive focus (for tab cycling).
   */
  focusElements?: string[];
  /**
   * Log buffer for console output.
   */
  logBuffer: LogBuffer;
  /**
   * Whether to show exit message even on successful exit (for debug mode).
   */
  debug?: boolean;
};

/**
 * Renders a CLI app with common exit signal handling and UI setup.
 * This handles:
 * - Creating and managing exit signals
 * - Rendering the App wrapper with console support
 * - Waiting for exit signals (SIGINT, SIGTERM)
 * - Cleanup on exit
 */
export const renderApp = (options: RenderAppOptions): Effect.Effect<void> =>
  Effect.gen(function* () {
    const exitSignal = yield* Deferred.make<void, never>();

    // Render.
    yield* Effect.promise(() =>
      render(
        () => (
          <App focusElements={options.focusElements} logBuffer={options.logBuffer} theme={theme}>
            {options.children()}
          </App>
        ),
        {
          exitOnCtrlC: true,
          exitSignals: ['SIGINT', 'SIGTERM'],
          openConsoleOnError: true,
          consoleOptions: {
            position: ConsolePosition.TOP,
            sizePercent: 25, // TODO(burdon): Option.
            colorDefault: theme.log.default,
            colorDebug: theme.log.debug,
            colorInfo: theme.log.info,
            colorWarn: theme.log.warn,
            colorError: theme.log.error,
          },
          // NOTE: Called on on SIGINT (ctrl-c) and SIGTERM (via pkill not killall).
          onDestroy: () => {
            options.logBuffer.close();
            Effect.runSync(Deferred.succeed(exitSignal, undefined));
          },
        },
      ),
    );

    // Wait for exit.
    yield* Deferred.await(exitSignal).pipe(
      Effect.onExit((exit) =>
        Effect.sync(() => {
          const cause = Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined;
          if (cause || options.debug) {
            process.stderr.write(['exit:', cause ?? 'OK', '\n'].join(' '));
          }
        }),
      ),
    );
  });
