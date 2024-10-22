//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Options } from './components';

const Root = () => {
  return (
    <ThemeProvider tx={defaultTx} themeMode='dark'>
      <div className='absolute inset-0 flex justify-center overflow-hidden dark bg-base'>
        <div className='flex flex-col overflow-y-auto max-w-[640px] w-full'>
          <Options />
        </div>
      </div>
    </ThemeProvider>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
