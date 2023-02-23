//
// Copyright 2022 DXOS.org
//

import React, { createElement, useEffect } from 'react';
import { ThemeProvider } from '@dxos/react-components';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/
    }
  }
};

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      // The icon for the toolbar item
      icon: 'circlehollow',
      // Array of options
      items: [
        { value: 'light', icon: 'circlehollow', title: 'light' },
        { value: 'dark', icon: 'circle', title: 'dark' },
      ],
      // Property that specifies if the name of the item will be displayed
      showName: true,
    },
  },
}

const withTheme = (StoryFn, context) => {
  const theme = context?.parameters?.theme || context?.globals?.theme;
  useEffect(()=>{
    document.documentElement.classList[theme === 'dark' ? 'add' : 'remove']('dark')
  }, [theme])
  return createElement(ThemeProvider, {children: createElement(StoryFn)})
}

export const decorators = [withTheme];
