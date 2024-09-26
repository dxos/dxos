//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Button, DensityProvider, Icon, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

const Root = () => {
  return (
    <ThemeProvider tx={defaultTx} themeMode='dark'>
      <DensityProvider density='fine'>
        <div className='flex flex-col w-[300px] p-4 bg-base'>
          <h1>Composer</h1>
          <Icon icon={'ph--play--regular'} size={5} />
          <Button>Test</Button>
        </div>
      </DensityProvider>
    </ThemeProvider>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
