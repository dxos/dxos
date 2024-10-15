//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ClientProvider, type ClientProviderProps } from '@dxos/react-client';
import { DensityProvider, type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Devtools } from './Devtools';
import { ErrorBoundary } from '../components';

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
    <ThemeProvider {...{ tx: defaultTx, themeMode }}>
      <DensityProvider density='fine'>
        <ErrorBoundary>
          <ClientProvider {...props}>
            <Devtools />
          </ClientProvider>
        </ErrorBoundary>
      </DensityProvider>
    </ThemeProvider>
  );
};

export default App;
