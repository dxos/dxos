//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Composer } from '@dxos/brand';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/ui-theme';

export const Placeholder = ({ stage = 1 }: { stage?: number }) => {
  // This is used to test the error boundary & reset dialog.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  return (
    <ThemeProvider tx={defaultTx}>
      <div className='flex flex-col h-dvh'>
        <div className='flex flex-col grow justify-center items-center'>
          <Composer
            className={mx(
              'w-[300px] h-[300px] transition-all duration-500 ease-in-out filter grayscale opacity-0',
              stage >= 1 && 'grayscale-0 opacity-70',
              stage >= 2 && 'opacity-0',
            )}
          />
        </div>
        <Status variant='main-bottom' indeterminate aria-label='Initializing' />
      </div>
    </ThemeProvider>
  );
};
