//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ClientProvider, type ClientProviderProps } from '@dxos/react-client';
import { type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/ui-theme';

import { ErrorBoundary } from '../components';

import { Devtools } from './Devtools';

// TODO(burdon): Factor out. See copy paste in testbench-app.
const useThemeWatcher = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const setTheme = ({ matches: prefersDark }: { matches?: boolean }) => {
    document.documentElement.classList[prefersDark ? 'add' : 'remove']('dark');
    setThemeMode(prefersDark ? 'dark' : 'light');
  };

  useEffect(() => {
    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme({ matches: modeQuery.matches });
    modeQuery.addEventListener('change', setTheme);
    return () => modeQuery.removeEventListener('change', setTheme);
  }, []);

  return themeMode;
};

export const App = (props: ClientProviderProps) => {
  const themeMode = useThemeWatcher();

  return (
    <ThemeProvider {...{ tx: defaultTx, themeMode }} noCache>
      <ErrorBoundary>
        <ClientProvider {...props}>
          <Devtools />
        </ClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
