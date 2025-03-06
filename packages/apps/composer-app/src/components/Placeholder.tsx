//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

// TODO(burdon): Create skeleton.
export const Placeholder = () => {
  // This is used to test the error boundary & reset dialog.
  if (location.search === '?throw') {
    throw new Error('Test error');
  }

  return (
    <ThemeProvider tx={defaultTx}>
      <div className='flex flex-col justify-end bs-dvh'>
        <Status variant='main-bottom' indeterminate aria-label='Initializing' />
      </div>
    </ThemeProvider>
  );
};
