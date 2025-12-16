//
// Copyright 2025 DXOS.org
//

import { DebugOverlayCorner, type KeyEvent, hexToRgb } from '@opentui/core';
import { useKeyboard, useRenderer } from '@opentui/solid';
import {
  type Accessor,
  ErrorBoundary,
  type ParentProps,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';

import { log } from '@dxos/log';
import { isTruthy } from '@dxos/util';

import { type LogBuffer } from '../../../util';
import { theme } from '../theme';

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
  debug?: boolean;
  focusElements?: string[];
  logBuffer?: LogBuffer;
}>;

/**
 * Common app bootstrap across all commands.
 */
// TODO(burdon): Factor out (common to all commands).
export const App = (props: AppProps) => {
  const renderer = useRenderer();
  renderer.setBackgroundColor(theme.bg);
  renderer.useConsole = true;
  if (props.debug) {
    renderer.configureDebugOverlay({
      enabled: true,
      corner: DebugOverlayCorner.bottomRight,
    });
  }

  log.info('debug overlay', { debug: props.debug });

  // Focus.
  const focusElements = [...(props.focusElements ?? [])];
  const [focus, setFocus] = createSignal<string | undefined>(props.focusElements?.[0]);
  const [showConsole, setShowConsole] = createSignal(props.debug ?? false);
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
      hint: '[ctrl-j]: Toggle console',
      handler: (key: KeyEvent) => {
        if (key.name === 'j' && key.ctrl) {
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
    // TODO(burdon): Better way to detech screen corrupted?
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
              <text style={{ fg: theme.log.error }}>{err.stack}</text>
            </box>
          );
        }}
      >
        {props.children}
      </ErrorBoundary>
    </AppContext.Provider>
  );
};
