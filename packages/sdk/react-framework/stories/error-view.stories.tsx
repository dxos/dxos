//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ErrorBoundary, ErrorView } from '../src';

export default {
  title: 'ErrorView'
};

export const Primary = () => {
  const error = new Error('Test Error');

  return (
    <ErrorView
      error={error}
      onReset={() => {}}
      onRestart={() => {}}
      config={{
        testing: true
      }}
    />
  );
};

const TestApp = () => {
  const [value, setValue] = useState(true);
  useEffect(() => {
    const t = setTimeout((() => {
      setValue(false);
    }));

    return () => clearTimeout(t);
  });

  return (
    <div>App</div>
  );
}

export const Boundary = () => {

  return (
    <ErrorBoundary>
      <TestApp />
    </ErrorBoundary>
  );
}
