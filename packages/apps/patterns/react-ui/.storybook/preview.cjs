import React, { createElement, useEffect } from 'react';
import { useDarkMode } from 'storybook-dark-mode';
import { ThemeProvider } from '@dxos/react-components';
import {osTranslations} from '../src'

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  }
};

const ThemeWrapper = ({ children }) => {
  // render your custom theme provider
  const darkMode = useDarkMode();
  console.log('[dark mode]', darkMode);
  useEffect(() => {
    document.documentElement.classList[darkMode ? 'add' : 'remove']('dark');
  }, [darkMode]);
  return children;
};

export const decorators = [
  (Story) => (
    createElement(ThemeProvider, {
      resourceExtensions: [osTranslations],
      children: createElement(ThemeWrapper, {
        children: createElement(Story)
      })
    })
  )
];
