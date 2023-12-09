//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { useEffect, createElement } from 'react';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

export const withTheme: Decorator = (StoryFn, context) => {
  const theme = context?.parameters?.theme || context?.globals?.theme;
  useEffect(() => {
    document.documentElement.classList[theme === 'dark' ? 'add' : 'remove']('dark');
  }, [theme]);

  return createElement(ThemeProvider, {
    children: createElement(StoryFn),
    tx: defaultTx,
  });
};
