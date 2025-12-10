//
// Copyright 2025 DXOS.org
//

import { useKeyboard, useRenderer } from '@opentui/solid';
import { type Accessor, type ParentProps, createContext, createSignal, onMount } from 'solid-js';

export const AppContext = createContext<{
  focus?: Accessor<string | undefined>;
  hints?: string[];
}>({});

export type AppProps = ParentProps<{
  focusElements?: string[];
  showConsole?: boolean;
}>;

/**
 * Common app bootstrap across all commands.
 */
// TODO(burdon): Factor out (common to all commands).
export const App = (props: AppProps) => {
  const [focus, setFocus] = createSignal<string | undefined>(props.focusElements?.[0]);

  const focusElements = [...(props.focusElements ?? [])];
  const hints = ['ctrl-c | esc'];

  const renderer = useRenderer();
  onMount(() => {
    console.log('ready');
    // renderer.setBackgroundColor(theme.bg);
  });

  if (props.showConsole) {
    // Use ctrl-p to cycle position, +/- to resize at runtime (when focused).
    renderer.useConsole = true;
    renderer.console.show();
    renderer.console.focus();
    focusElements.splice(0, 0, 'console');
    hints.push('tab');
    setFocus('console');
  }

  // Toggle focus between console and app content with tab.
  useKeyboard((key) => {
    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      renderer.destroy();
      process.exit(0);
    }

    if (key.name === 'tab' && props.showConsole) {
      const idx = focusElements.findIndex((f) => f === focus());
      setFocus(idx === focusElements.length - 1 ? focusElements[0] : focusElements[(idx + 1) % focusElements.length]);
      if (focus() === 'console') {
        // renderer.console.show();
        renderer.console.focus();
      } else {
        // renderer.console.hide();
        renderer.console.blur();
      }

      return true;
    }
  });

  return <AppContext.Provider value={{ focus, hints }}>{props.children}</AppContext.Provider>;
};
