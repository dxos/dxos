//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '@dxos/react-components';

import { ErrorProvider } from './ErrorProvider';

export default {
  component: ErrorProvider
};

const UnhandledRejectionThrower = () => {
  return (
    <Button
      onClick={() => {
        void new Promise((resolve, reject) => {
          throw new Error('Broken promise.');
        });
      }}
    >
      Throw an unhandled rejection
    </Button>
  );
};

export const Default = {
  render: () => {
    <ErrorProvider>
      <div className='flex flex-col gap-4'>
        <UnhandledRejectionThrower />
      </div>
    </ErrorProvider>;
  }
};
