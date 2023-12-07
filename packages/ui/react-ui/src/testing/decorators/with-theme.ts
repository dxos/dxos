//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { useEffect, createElement } from 'react';

import { defaultTx } from '@dxos/react-ui-theme';

import { ThemeProvider } from '../../components';

export const withTheme: Decorator = (StoryFn, context) => {
  const theme = context?.parameters?.theme || context?.globals?.theme;
  useEffect(() => {
    document.documentElement.classList[theme === 'dark' ? 'add' : 'remove']('dark');
  }, [theme]);

  console.log('[withTheme]', defaultTx('input.input', 'never', {}));

  return createElement(ThemeProvider, {
    children: createElement(StoryFn),
    tx: defaultTx,
  });
};
