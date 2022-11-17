import React, { createElement, useEffect } from 'react';
import { useDarkMode } from 'storybook-dark-mode';
import { UiKitProvider, Loading } from '@dxos/react-uikit';
import {translations} from '@dxos/react-appkit';

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
  (Story) => {
    return createElement(UiKitProvider, {
      resourceExtensions: [translations],
      fallback: createElement(Loading, {label: 'Loading…'}),
      children: createElement(ThemeWrapper, {
        children: createElement(Story)
      })
    })
  }
];
