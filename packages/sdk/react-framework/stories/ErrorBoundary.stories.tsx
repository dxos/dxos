//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useState } from 'react';

import { Alert, Box, Button } from '@mui/material';

import { ErrorBoundary, ErrorView, FrameworkContextProvider, useError } from '../src';

export default {
  title: 'react-framework/ErrorBoundary'
};

debug.enable('*');

export const View = () => {
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

enum ErrorType {
  Async,
  Promise,
  Invalid
}

const TestApp = () => {
  const [error, resetError] = useError();
  const [trigger, setTrigger] = useState<ErrorType | undefined>();

  useEffect(() => {
    switch (trigger) {
      case ErrorType.Async: {
        setTimeout(() => {
          throw new Error('Async error.');
        }, 1000);
        break;
      }

      case ErrorType.Promise: {
        setImmediate(async () => await new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Promise rejected.'));
          }, 1000);
        }));
        break;
      }
    }
  }, [trigger]);

  // Trigger ErrorBoundary.
  if (trigger === ErrorType.Invalid) {
    return undefined;
  }

  const TestComponent = () => {
    return (
      <Box>
        <Box>
          <Button onClick={() => setTrigger(ErrorType.Invalid)}>
            Render
          </Button>
          <Button onClick={() => setTrigger(ErrorType.Async)}>
            Async
          </Button>
          <Button onClick={() => setTrigger(ErrorType.Promise)}>
            Promise
          </Button>
          <Button onClick={resetError} color='secondary'>
            Reset
          </Button>
        </Box>

        {error && (
          <Box>
            <Alert severity='error'>{String(error)}</Alert>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ padding: 2 }}>
      <TestComponent />
    </Box>
  );
};

export const Boundary = () => {
  const App = TestApp as any; // Don't warn about undefined return value.

  return (
    <FrameworkContextProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </FrameworkContextProvider>
  );
};
