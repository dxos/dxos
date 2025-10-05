//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { createElement, useEffect } from 'react';

import { defaultTx } from '@dxos/react-ui-theme';

import { ThemeProvider } from '../../components';

export const withTheme: Decorator = (Story, context) => {
  const theme = context?.parameters?.theme || context?.globals?.theme;
  useEffect(() => {
    document.documentElement.classList[theme === 'dark' ? 'add' : 'remove']('dark');
  }, [theme]);

  return createElement(
    ThemeProvider,
    {
      tx: defaultTx,
    },
    createElement(Story as any),
  );
};
