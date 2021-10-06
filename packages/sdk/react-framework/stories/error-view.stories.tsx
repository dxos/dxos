//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ErrorView } from '../src';

export default {
  title: 'ErrorView'
};

export const Primary = () => {
  const error = new Error('Error CODE');

  // TODO(burdon): Rename ErrorBoundary?
  return (
    <ErrorView error={error} onRestart={() => {}} />
  );
};
