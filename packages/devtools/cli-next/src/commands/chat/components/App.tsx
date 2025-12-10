//
// Copyright 2025 DXOS.org
//

import { useKeyboard, useRenderer } from '@opentui/solid';
import { type ParentProps, createSignal, onMount } from 'solid-js';

import { restoreTerminal } from '../hooks';
import { theme } from '../theme';

export type AppProps = ParentProps<{
  showConsole?: boolean;
}>;

/**
 * Common app bootstrap across all commands.
 */
// TODO(burdon): Factor out (common to all commands).
export const App = ({ children, showConsole }: AppProps) => {
  const renderer = useRenderer();
  if (showConsole) {
    // Use ctrl-p to cycle position, +/- to resize at runtime (when focused).
    renderer.useConsole = true;
    renderer.console.show();
    renderer.console.blur();
  }

  // Toggle focus between console and app content with tab.
  const [consoleFocused, setConsoleFocused] = createSignal(false);
  useKeyboard((key) => {
    if (key.name === 'tab' && renderer.useConsole) {
      if (consoleFocused()) {
        renderer.console.blur();
        setConsoleFocused(false);
      } else {
        renderer.console.focus();
        setConsoleFocused(true);
      }

      return true;
    }
  });

  onMount(() => {
    renderer.setBackgroundColor(theme.bg);
  });

  // Ensure clean exit on errors or signals.
  {
    const cleanup = () => {
      restoreTerminal();
      process.exit(1);
    };
    process.on('uncaughtException', cleanup);
    process.on('unhandledRejection', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  return <>{children}</>;
};
