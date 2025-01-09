//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApp, IntentPlugin, SettingsPlugin } from '@dxos/app-framework/next';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { DeckPlugin } from '@dxos/plugin-deck';
import { GraphPlugin } from '@dxos/plugin-graph';
import { ThemePlugin } from '@dxos/plugin-theme';
import { Status, Tooltip, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { ResetDialog } from './components';
import translations from './translations';

const plugins = [
  AttentionPlugin,
  DeckPlugin,
  GraphPlugin,
  IntentPlugin,
  ThemePlugin({ appName: 'Composer' }),
  SettingsPlugin,
];

const main = async () => {
  registerSignalsRuntime();

  const App = createApp({
    fallback: ({ error }) => (
      <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
        <Tooltip.Provider>
          <ResetDialog error={error} config={undefined} />
        </Tooltip.Provider>
      </ThemeProvider>
    ),
    placeholder: (
      <ThemeProvider tx={defaultTx}>
        <div className='flex flex-col justify-end bs-dvh'>
          <Status variant='main-bottom' indeterminate aria-label='Initializing' />
        </div>
      </ThemeProvider>
    ),
    plugins,
    core: plugins.map((plugin) => plugin.meta.id),
  });

  const root = document.getElementById('root')!;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
