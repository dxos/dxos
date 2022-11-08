import React, { createElement, useEffect } from 'react';
import { useDarkMode } from 'storybook-dark-mode';
import { UiKitProvider } from '@dxos/react-uikit';

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
  useEffect(() => {
    document.documentElement.classList[darkMode ? 'add' : 'remove']('dark');
  }, [darkMode]);
  return children;
};

export const decorators = [
  (Story) => (
    createElement(UiKitProvider, {
      children: createElement(ThemeWrapper, {
        children: createElement(Story)
      })
    })
  )
];
