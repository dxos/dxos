//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React from 'react';
import { I18nProvider } from 'react-aria-components';

import { type ThemeMode } from '@dxos/ui-types';

import { Tooltip } from '../../components';
import { type ThemeContextValue, ThemeProvider } from '../../providers';
import { defaultTx } from '../../theme';

/**
 * Adds theme decorator.
 *
 * `I18nProvider` is included so react-aria-components-backed widgets (DateField, Calendar, …)
 * have a guaranteed locale in headless test environments where `navigator.language` may be
 * empty.
 */
export const withTheme =
  ({ tx = defaultTx, platform }: Partial<ThemeContextValue> = {}): Decorator =>
  (Story, context) => {
    const {
      globals: { theme },
      parameters: { translations },
    } = context;

    return (
      <I18nProvider locale='en-US'>
        <ThemeProvider
          tx={tx}
          themeMode={(theme as ThemeMode) || 'dark'}
          resourceExtensions={translations}
          platform={platform}
        >
          <Tooltip.Provider>
            <Story />
          </Tooltip.Provider>
        </ThemeProvider>
      </I18nProvider>
    );
  };
