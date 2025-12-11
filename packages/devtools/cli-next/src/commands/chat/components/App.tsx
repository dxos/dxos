//
// Copyright 2025 DXOS.org
//

import { type KeyEvent } from '@opentui/core';
import { useKeyboard, useRenderer } from '@opentui/solid';
import { type Accessor, type ParentProps, createContext, createEffect, createSignal, onMount } from 'solid-js';

import { log } from '@dxos/log';
import { isTruthy } from '@dxos/util';

import { type LogBuffer } from '../../../util';
import { theme } from '../theme';

export type KeyHandler = {
  hint: string;
  handler: (key: KeyEvent) => void;
};

export const AppContext = createContext<{
  focus: Accessor<string | undefined>;
  hint: Accessor<string | undefined>;
}>();

export type AppProps = ParentProps<{
  showConsole?: boolean;
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
  renderer.useConsole = props.showConsole ?? false;

  // Focus.
  const focusElements = [...(props.focusElements ?? [])];
  const [focus, setFocus] = createSignal<string | undefined>(props.focusElements?.[0]);
  const [showConsole, setShowConsole] = createSignal<boolean>(false);

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
    props.showConsole && {
      hint: '[f1]: Toggle console',
      handler: (key: KeyEvent) => {
        if (key.name === 'f1' && props.showConsole) {
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
    if (!props.showConsole) {
      return;
    }

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
  });

  // Toggle focus between console and app content with tab.
  useKeyboard((key) => {
    handlers.forEach((handler) => {
      handler.handler(key);
    });
  });

  return (
    <AppContext.Provider value={{ focus, hint }}>
      <box marginTop={showConsole() ? 13 : 0}>{props.children}</box>
    </AppContext.Provider>
  );
};
