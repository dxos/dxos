//
// Copyright 2020 DXOS.org
//

import React from 'react';

import ErrorBoundary from '../src/components/ErrorBoundary';

const FaultyComponent = () => {
  throw new Error('Something went wrong');
};

export const WithErrorBoundary = () => {
  const handleError = (...args) => console.error(...args);

  return (
    <ErrorBoundary
      onError={handleError}
      onRestart={() => null}
      onReset={() => null}
    >
      <FaultyComponent />
    </ErrorBoundary>
  );
};
