//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';

import { Alert, Box, Button } from '@mui/material';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { ErrorBoundary, ErrorView, FrameworkContextProvider, useErrors } from '../src';

export default {
  title: 'react-framework/ErrorBoundary'
};

debug.enable('*');

enum ErrorType {
  Async = 1,
  Promise = 2,
  Invalid = 3
}

const TestApp = () => {
  const [errors, resetError] = useErrors();
  const [trigger, setTrigger] = useState<ErrorType | undefined>();

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    switch (trigger) {
      case ErrorType.Async: {
        t = setTimeout(() => {
          setTrigger(undefined);
          throw new Error('Async error.');
        }, 1000);
        break;
      }

      case ErrorType.Promise: {
        setImmediate(async () => await new Promise((resolve, reject) => {
          t = setTimeout(() => {
            setTrigger(undefined);
            reject(new Error('Promise rejected.'));
          }, 1000);
        }));
        break;
      }
    }

    return () => clearTimeout(t);
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

        {errors.length > 0 && (
          <Box>
            {errors.map((error, i) => (
              <Alert key={i} severity='error'>{String(error)}</Alert>
            ))}
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
    <ErrorBoundary
      onReset={async () => {
        clientRef.current!.reset();
      }}
    >
      <ClientProvider clientRef={clientRef}>
        <FrameworkContextProvider>
          <App />
        </FrameworkContextProvider>
      </ClientProvider>
    </ErrorBoundary>
  );
};

export const View = () => {
  const error = new Error('Test Error');

  return (
    <ErrorView
      error={error}
      context={{
        testing: true
      }}
    />
  );
};
