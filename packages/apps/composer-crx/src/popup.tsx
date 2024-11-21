//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Popup } from './components';

const Root = () => {
  return (
    <ThemeProvider tx={defaultTx} themeMode='dark'>
      <div className='dark'>
        <Popup />
      </div>
    </ThemeProvider>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
