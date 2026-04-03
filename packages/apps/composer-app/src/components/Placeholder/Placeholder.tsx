//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type PlaceholderProps } from '@dxos/app-framework/ui';
import { Composer } from '@dxos/brand';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/ui-theme';

export const Placeholder = ({ stage = 1, progress }: PlaceholderProps) => {
  // This is used to test the error boundary & reset dialog.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  const hasProgress = progress && progress.total > 0;

  return (
    <ThemeProvider tx={defaultTx}>
      <div className='relative flex flex-col h-dvh'>
        <div className='flex flex-col grow justify-center items-center'>
          <Composer
            className={mx(
              'h-[300px] w-[300px] scale-600 transition-all duration-500 ease-in-out filter grayscale opacity-0',
              stage >= 1 && 'scale-100 grayscale-0 opacity-70',
              stage >= 2 && 'scale-50 opacity-0',
            )}
          />
          {hasProgress && (
            <p className='flex justify-center absolute bottom-8 text-sm text-subdued mt-4 transition-opacity duration-300'>
              {progress.status} ({Math.round(progress.progress * 100)}%)
            </p>
          )}
        </div>
        <Status
          variant='main-bottom'
          aria-label='Initializing'
          {...(hasProgress ? { progress: progress.progress } : { indeterminate: true })}
        />
      </div>
    </ThemeProvider>
  );
};
