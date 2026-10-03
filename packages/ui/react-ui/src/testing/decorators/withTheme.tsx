//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React from 'react';
import { I18nProvider } from 'react-aria-components';

import { type ThemeMode } from '@dxos/ui-types';

import * as ThemeProvider from '../../providers/ThemeProvider/ThemeProvider.tsx';
import { defaultTx } from '../../theme/defaultTheme.ts';

/**
 * Adds theme decorator.
 *
 * `I18nProvider` is included so react-aria-components-backed widgets (DateField, Calendar, …)
 * have a guaranteed locale in headless test environments where `navigator.language` may be
 * empty.
 */
export const withTheme =
  ({ tx = defaultTx, platform }: Partial<ThemeProvider.ThemeContextValue> = {}): Decorator =>
  (Story, context) => {
    const {
      globals: { theme },
      parameters: { translations },
    } = context;

    return (
      <I18nProvider locale='en-US'>
        <ThemeProvider.ThemeProvider
          tx={tx}
          themeMode={(theme as ThemeMode) || 'dark'}
          resourceExtensions={translations}
          platform={platform}
        >
          <Story />
        </ThemeProvider.ThemeProvider>
      </I18nProvider>
    );
  };
