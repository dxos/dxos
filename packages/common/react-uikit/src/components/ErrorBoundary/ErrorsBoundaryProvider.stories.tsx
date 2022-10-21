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

const ErrorThrower = () => {
  const [throwError, setThrowError] = useState(false);
  if (throwError) {
    throw new Error('A wild Error appeared!');
  }
  return <Button onClick={() => setThrowError(true)}>Throw an error</Button>;
};

const Template = (_args: {}) => (
  <ErrorsBoundaryProvider>
    <ErrorThrower />
  </ErrorsBoundaryProvider>
);

export const Default = templateForComponent(Template)({});
Default.args = {};
