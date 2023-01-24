//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { appkitTranslations, Fallback } from '@dxos/react-appkit';
import { ThemeProvider } from '@dxos/react-components';

import kaiTranslations from '../translations';
import { App } from './App';

// TODO(burdon): Get debug from config.
export const Root = () => {
  // TODO(burdon): Modes from env/config.
  // const demo = process.env.DEMO === 'true';
  return (
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <App debug={process.env.DEBUG === 'true'} />
    </ThemeProvider>
  );
};
