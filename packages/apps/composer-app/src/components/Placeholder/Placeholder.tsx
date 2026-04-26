//
// Copyright 2025 DXOS.org
//

import React, { useLayoutEffect } from 'react';

import { type PlaceholderProps } from '@dxos/app-framework/ui';
import { Composer } from '@dxos/brand';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/ui-theme';

export const Placeholder = ({ stage = 1, progress }: PlaceholderProps) => {
  // This is used to test the error boundary & reset dialog.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  // Phase 8a: hand off from the native-DOM boot loader once the React
  // placeholder is *visible*. We delay dismiss until `stage >= 1` because the
  // Composer logo here is `opacity-0` at `stage = 0` (Loading) and only
  // becomes visible at `FadeIn` and beyond. Dismissing on mount would expose
  // a blank-with-status-bar frame for one debounce tick. `useLayoutEffect`
  // ensures the dismiss is committed before the next paint.
  useLayoutEffect(() => {
    if (stage >= 1) {
      window.__bootLoader?.dismiss();
    }
  }, [stage]);

  const hasProgress = !!progress && progress.total > 0;

  return (
    <ThemeProvider tx={defaultTx}>
      <div role='none' className='relative dx-container h-dvh flex flex-col'>
        <div role='none' className='flex flex-col grow justify-center items-center'>
          <Composer
            className={mx(
              'h-[300px] w-[300px] scale-600 transition-all duration-500 ease-in-out filter grayscale opacity-0',
              stage >= 1 && 'scale-100 grayscale-0 opacity-70',
              stage >= 2 && 'scale-50 opacity-0',
            )}
          />
        </div>
        {/* <Status
          variant='main-bottom'
          aria-label='Initializing'
          {...(hasProgress ? { progress: progress!.progress } : { indeterminate: true })}
        /> */}
      </div>
    </ThemeProvider>
  );
};
