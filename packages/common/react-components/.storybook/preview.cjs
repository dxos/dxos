import React, {createElement} from 'react';
import {ThemeProvider} from '../src';

export const parameters = {
  actions: {argTypesRegex: "^on[A-Z].*"},
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  darkMode: {
    darkClass: 'dark',
    lightClass: '',
    stylePreview: true
  }
}

export const decorators = [
  (Story) => createElement(ThemeProvider, {children: createElement(Story)})
];
