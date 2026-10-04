//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ClientProvider, type ClientProviderProps } from '@dxos/react-client';
import { translations as logPanelTranslations } from '@dxos/react-ui-debug/translations';
import * as ErrorFallback from '@dxos/react-ui/ErrorFallback';
import * as Theme from '@dxos/react-ui/Theme';
import { type ThemeMode } from '@dxos/ui-types';

import { Devtools } from './Devtools.tsx';

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
    <Theme.Provider {...{ tx: Theme.defaultTx, themeMode }} resourceExtensions={logPanelTranslations}>
      <ErrorFallback.ErrorBoundary name='devtools.app'>
        <ClientProvider {...props}>
          <Devtools />
        </ClientProvider>
      </ErrorFallback.ErrorBoundary>
    </Theme.Provider>
  );
};

export default App;
