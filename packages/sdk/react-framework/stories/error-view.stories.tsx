//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
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
      context={{
        testing: true
      }}
    />
  );
};

const TestApp = () => {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count === 0) {
      return;
    }

    const t = setTimeout((() => {
      setCount(count - 1);
    }), 1000);

    return () => clearTimeout(t);
  }, [count]);

  const TestComponent = ({ count }: { count: number }) => {
    if (count === 0) {
      throw new Error();
    }

    return (
      <div>Count: {count}</div>
    );
  };

  return (
    <Box sx={{ padding: 2 }}>
      <TestComponent count={count} />
    </Box>
  );
}

export const Boundary = () => {

  return (
    <ErrorBoundary>
      <TestApp />
    </ErrorBoundary>
  );
}
