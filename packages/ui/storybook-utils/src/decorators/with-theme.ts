//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { useEffect, createElement, useState } from 'react';

import { type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

/**
 * See ThemePlugin.
 * Changes if the system settings or storybook settings are changed.
 */
export const withTheme: Decorator = (StoryFn, context) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>();

  // Add/remove class.
  useEffect(() => {
    document.documentElement.classList[themeMode === 'dark' ? 'add' : 'remove']('dark');
  }, [themeMode]);

  // Update via storybook.
  useEffect(
    () => setThemeMode(context?.parameters?.theme || context?.globals?.theme),
    [context?.parameters?.theme, context?.globals?.theme],
  );

  // Update via system.
  // TODO(burdon): Make optional?
  // const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  // useEffect(() => {
  //   const onThemeChange = ({ matches: prefersDark }: { matches?: boolean }) => {
  //     setThemeMode(prefersDark ? 'dark' : 'light');
  //   };
  //
  //   onThemeChange({ matches: modeQuery.matches });
  //   modeQuery.addEventListener('change', onThemeChange);
  //   return () => modeQuery.removeEventListener('change', onThemeChange);
  // }, []);

  return createElement(ThemeProvider, {
    children: createElement(StoryFn),
    themeMode,
    tx: defaultTx,
    resourceExtensions: context?.parameters?.translations,
  });
};
