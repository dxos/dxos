import React, { createElement, useEffect } from 'react';
import { useDarkMode } from 'storybook-dark-mode';
import { TranslationsProvider } from '../src/translations';
import { UiProvider } from '@dxos/react-ui';

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
    createElement(UiProvider, {
      children: createElement(TranslationsProvider, {
        children: createElement(ThemeWrapper, {
          children: createElement(Story)
        })
      })
    })
  )
];
