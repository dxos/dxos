//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { Button } from '@dxos/react-ui';

import { templateForComponent } from '../../testing';
import { ErrorsBoundaryProvider } from './ErrorsBoundaryProvider';

export default {
  title: 'react-uikit/ErrorsBoundaryProvider',
  component: ErrorsBoundaryProvider
};

const FatalErrorThrower = () => {
  const [throwError, setThrowError] = useState(false);
  if (throwError) {
    throw new Error('A wild MISSING№ appeared!');
  }
  return <Button onClick={() => setThrowError(true)}>Throw a fatal error</Button>;
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

const Template = (_args: {}) => (
  <ErrorsBoundaryProvider>
    <div className='flex flex-col gap-4'>
      <FatalErrorThrower />
      <UnhandledRejectionThrower />
    </div>
  </ErrorsBoundaryProvider>
);

export const Default = templateForComponent(Template)({});
Default.args = {};
