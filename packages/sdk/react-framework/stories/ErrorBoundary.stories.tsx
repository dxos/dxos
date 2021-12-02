//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';

import { Alert, Box, Button } from '@mui/material';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { ErrorBoundary, ErrorView, FrameworkContextProvider, useError } from '../src';

export default {
  title: 'react-framework/ErrorBoundary'
};

// TODO(burdon): Unset by client.
debug.enable('*');

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

  // Trigger ErrorBoundary: "Nothing was returned from render."
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

export const Primary = () => {
  // Forward reference to client (since can't use context here).
  const clientRef = useRef<Client>();

  // Cast to any to suppress warning about undefined return value.
  const App = TestApp as any;

  return (
    <ClientProvider clientRef={clientRef}>
      <FrameworkContextProvider>
        <ErrorBoundary
          onReset={async () => {
            clientRef.current!.reset();
            window.location.reload();
          }}
        >
          <App />
        </ErrorBoundary>
      </FrameworkContextProvider>
    </ClientProvider>
  );
};

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
