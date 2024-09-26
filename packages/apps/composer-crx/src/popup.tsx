//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { DensityProvider, Icon, Input, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

const Root = () => {
  // TODO(burdon): Fix dark mode.
  return (
    <div className='dark'>
      <ThemeProvider tx={defaultTx} themeMode='dark'>
        <DensityProvider density='fine'>
          <div className='flex flex-col w-[300px] p-4 gap-2 bg-base'>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl text-accentText'>Composer</h1>
            </div>
            <div className='flex gap-2 items-center'>
              <Input.Root>
                <Input.TextInput autoFocus placeholder='Enter' />
              </Input.Root>
              <Icon icon={'ph--play--regular'} size={5} />
            </div>
          </div>
        </DensityProvider>
      </ThemeProvider>
    </div>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
