//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React from 'react';

import { type ThemeMode } from '@dxos/ui-types';

import * as Theme from '../../providers/ThemeProvider/Theme.tsx';
import { defaultTx } from '../../theme/defaultTheme.ts';

/**
 * Adds theme decorator.
 */
export const withTheme =
  ({ tx = defaultTx, platform }: Partial<Theme.ThemeContextValue> = {}): Decorator =>
  (Story, context) => {
    const {
      globals: { theme },
      parameters: { translations },
    } = context;

    return (
      <Theme.Provider
        tx={tx}
        themeMode={(theme as ThemeMode) || 'dark'}
        resourceExtensions={translations}
        platform={platform}
      >
        <Story />
      </Theme.Provider>
    );
  };
