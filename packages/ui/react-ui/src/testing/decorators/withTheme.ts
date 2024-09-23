//
// Copyright 2023 DXOS.org
//

import { type Decorator, type StoryContext, type StoryFn } from '@storybook/react';
import { useEffect, createElement } from 'react';

import { defaultTx } from '@dxos/react-ui-theme';

import { ThemeProvider } from '../../components';

export const withTheme: Decorator = (Story: StoryFn, context: StoryContext) => {
  const theme = context?.parameters?.theme || context?.globals?.theme;
  useEffect(() => {
    document.documentElement.classList[theme === 'dark' ? 'add' : 'remove']('dark');
  }, [theme]);

  return createElement(ThemeProvider, {
    children: createElement(Story),
    tx: defaultTx,
  });
};
