//
// Copyright 2025 DXOS.org
//

import { ConsolePosition, type KeyEvent, hexToRgb } from '@opentui/core';
import { render, useKeyboard, useRenderer } from '@opentui/solid';
import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import {
  type Accessor,
  ErrorBoundary,
  type JSX,
  type ParentProps,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';

import { log } from '@dxos/log';
import { isTruthy } from '@dxos/util';

import { type Theme, theme } from '../theme';
import { type LogBuffer } from '../util';

export type KeyHandler = {
  hint: string;
  handler: (key: KeyEvent) => void;
};

/**
 * App context.
 */
export const AppContext = createContext<{
  focus: Accessor<string | undefined>;
  hint: Accessor<string | undefined>;
  processing: Accessor<boolean>;
  setProcessing: (processing: boolean) => void;
}>();

export type AppProps = ParentProps<{
  focusElements?: string[];
  logBuffer?: LogBuffer;
  theme?: Theme;
}>;

/**
 * Common app bootstrap across all commands.
 */
// TODO(burdon): Factor out (common to all commands).
export const App = (props: AppProps) => {
  const renderer = useRenderer();
  props.theme?.bg && renderer.setBackgroundColor(props.theme.bg);
  renderer.useConsole = true;

  // Focus.
  const focusElements = [...(props.focusElements ?? [])];
  const [focus, setFocus] = createSignal<string | undefined>(props.focusElements?.[0]);
  const [showConsole, setShowConsole] = createSignal(false); // TODO(burdon): Option.
  const [processing, setProcessing] = createSignal(false);

  // Hints.
  const [hint, setHint] = createSignal<string | undefined>();
  const randomHint = () => {
    if (handlers.length) {
      const hints = handlers.map((handler) => handler.hint);
      const idx = Math.floor(Math.random() * hints.length);
      setHint(hints[idx]);
    }
  };

  const handlers: KeyHandler[] = [
    //
    // Console
    //
    {
      hint: '[ctrl+l]: Toggle log view',
      handler: (key: KeyEvent) => {
        if ((key.ctrl && key.name === 'l') || key.name === 'f1') {
          setShowConsole(!showConsole());
        }
      },
    },

    //
    // Focus
    //
    {
      hint: '[tab]: Cycle focus',
      handler: (key: KeyEvent) => {
        if (key.name === 'tab') {
          const idx = focusElements.findIndex((f) => f === focus());
          setFocus(
            idx === focusElements.length - 1 ? focusElements[0] : focusElements[(idx + 1) % focusElements.length],
          );
          randomHint();
          if (focus() === 'console') {
            renderer.console.focus();
          } else {
            renderer.console.blur();
          }
        }
      },
    },
  ].filter(isTruthy);

  createEffect(() => {
    // Use ctrl-p to cycle position; +/- to resize at runtime (when focused).
    if (showConsole()) {
      renderer.console.show();
      if (!focusElements.includes('console')) {
        focusElements.splice(0, 0, 'console');
      }
    } else {
      renderer.console.hide();
      const idx = focusElements.indexOf('console');
      if (idx !== -1) {
        focusElements.splice(idx, 1);
      }

      if (focus() === 'console') {
        setFocus(focusElements[0]);
      }
    }

    randomHint();
  });

  onMount(() => {
    setFocus(props.focusElements?.[0]);
    randomHint();

    // Replay logs once.
    props.logBuffer?.replay();
    log.info('focus console then ctrl-s to save logs to file');

    // Repaint in case terminal is cleared (via cmd-k -- which is not propagated to the app from the terminal).
    const i = setInterval(() => {
      renderer.currentRenderBuffer.clear(hexToRgb('000000'));
      renderer.requestRender();
    }, 5_000);

    onCleanup(() => {
      clearInterval(i);
    });
  });

  // Toggle focus between console and app content with tab.
  useKeyboard((key) => {
    handlers.forEach((handler) => {
      handler.handler(key);
    });
  });

  return (
    <AppContext.Provider value={{ focus, hint, processing, setProcessing }}>
      <ErrorBoundary
        fallback={(err: any) => {
          log.catch(err);
          return (
            <box flexDirection='column' overflow='hidden'>
              <text style={{ fg: props.theme?.log?.error }}>{err.stack}</text>
            </box>
          );
        }}
      >
        {props.children}
      </ErrorBoundary>
    </AppContext.Provider>
  );
};

export type RenderAppOptions = {
  /**
   * The custom UI component to render inside the App wrapper.
   */
  children: () => JSX.Element;
  /**
   * Whether to show the console.
   */
  showConsole?: boolean;
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
  /**
   * Theme for the app.
   */
  theme?: Theme;
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
          <App focusElements={options.focusElements} logBuffer={options.logBuffer} theme={options.theme}>
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
