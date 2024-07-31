//
// Copyright 2023 DXOS.org
//

import { type Decorator, type StoryContext, type StoryFn } from '@storybook/react';
import { useEffect, createElement } from 'react';
import { useDarkMode } from 'storybook-dark-mode';

import { type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

/**
 * Changes theme based on storybook toolbar toggle.
 */
export const withTheme: Decorator = (Story: StoryFn, context: StoryContext) => {
  const dark = useDarkMode();
  const themeMode: ThemeMode = dark ? 'dark' : 'light';

  // Add/remove class.
  useEffect(() => {
    document.documentElement.classList[themeMode === 'dark' ? 'add' : 'remove']('dark');
  }, [themeMode]);

  return createElement(ThemeProvider, {
    children: createElement(Story),
    themeMode,
    tx: defaultTx,
    resourceExtensions: context?.parameters?.translations,
  });
};
