//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { FunctionComponent, ReactNode, useContext, useEffect } from 'react';

import { ErrorIndicatorProps } from '../../components/index.js';
import { ErrorContext } from '../../hooks/index.js';

const error = debug('dxos:react-toolkit:error');

// TODO(burdon): Override if dev-only?
const logError = (f: string, ...args: any[]) => error.enabled ? error(f, ...args) : console.error(f, ...args);

/**
 * Wrapper for global error handling.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
 */
export const GlobalErrorWrapper = ({
  children,
  indicator: ErrorIndicator
}: {
  children: ReactNode
  indicator?: FunctionComponent<ErrorIndicatorProps> | null
}) => {
  const { errors, addError, resetErrors } = useContext(ErrorContext)!;

  // Register global error handlers.
  // TODO(burdon): Post errors to monitoring service.
  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error?: Error) => {
      logError('onerror', message);
      addError(error!);
      return true; // Prevent default.
    };

    const listener = (event: any) => {
      logError('unhandledrejection', event.reason);
      addError(event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', listener);
    return () => {
      window.removeEventListener('unhandledrejection', listener as any);
    };
  }, []);

  return (
    <>
      {children}
      {ErrorIndicator && (
        <ErrorIndicator
          errors={errors}
          onReset={resetErrors}
        />
      )}
    </>
  );
};
