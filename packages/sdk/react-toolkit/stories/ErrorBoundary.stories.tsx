//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';

import { Alert, Box, Button } from '@mui/material';

import { Client } from '@dxos/client';
import { DXOSError } from '@dxos/debug';
import { ClientProvider } from '@dxos/react-client';

import { ErrorBoundary, ErrorView, useErrors } from '../src';

export default {
  title: 'react-toolkit/ErrorBoundary'
};

debug.enable('*');

enum ErrorType {
  Async = 1,
  AsyncFatal = 2,
  Promise = 3,
  PromiseFatal = 4,
  Invalid = 5
}

const TestApp = () => {
  const [errors, resetError] = useErrors();
  const [trigger, setTrigger] = useState<ErrorType | undefined>();

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    switch (trigger) {
      case ErrorType.Async:
      case ErrorType.AsyncFatal: {
        const code = trigger === ErrorType.Async ? 'NON_FATAL' : 'FATAL';
        t = setTimeout(() => {
          setTrigger(undefined);
          throw new DXOSError(code, 'Async error.');
        }, 1000);
        break;
      }

      case ErrorType.Promise:
      case ErrorType.PromiseFatal: {
        const code = trigger === ErrorType.Promise ? 'NON_FATAL' : 'FATAL';
        setImmediate(async () => await new Promise((resolve, reject) => {
          t = setTimeout(() => {
            setTrigger(undefined);
            reject(new DXOSError(code, 'Promise rejected.'));
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

  const TestComponent = () => (
    <Box>
      <Box>
        <Button onClick={() => setTrigger(ErrorType.Invalid)}>
          Render
        </Button>
        <Button onClick={() => setTrigger(ErrorType.Async)}>
          Async
        </Button>
        <Button onClick={() => setTrigger(ErrorType.AsyncFatal)}>
          Async Fatal
        </Button>
        <Button onClick={() => setTrigger(ErrorType.Promise)}>
          Promise
        </Button>
        <Button onClick={() => setTrigger(ErrorType.PromiseFatal)}>
          Promise Fatal
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
      onError={(error) => error.message.startsWith('FATAL')}
      onReset={async () => {
        await clientRef.current!.reset();
      }}
    >
      <ClientProvider clientRef={clientRef}>
        <App />
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
