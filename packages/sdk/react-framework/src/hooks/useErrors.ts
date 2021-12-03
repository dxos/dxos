//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import { createContext, useContext, useEffect } from 'react';

import { raise } from '@dxos/debug';

const logError = debug('dxos:react-framework:error');

export interface ErrorContextState {
  errors: Error[] // TODO(burdon): Timestamp?
  addError: (error: Error) => void
  resetErrors: () => void
}

export const ErrorContext = createContext<ErrorContextState | undefined>(undefined);

/**
 * Global error handling.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
 */
export const useErrors = (): [Error[], () => void] => {
  const log = debug.enabled('dxos:react-framework:error') ? logError : console.error;

  // TODO(burdon): Post errors to montioring service.
  const { errors, addError, resetErrors } = useContext(ErrorContext) ?? raise(new Error('Missing ErrorContext.'));

  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error?: Error) => {
      log('onerror', message);
      addError(error!);
      return true; // Prevent default.
    };

    const listener = (event: any) => {
      log('unhandledrejection', event.reason);
      addError(event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', listener);
    return () => {
      window.removeEventListener('unhandledrejection', listener as any);
    };
  }, []);

  return [errors, () => resetErrors()];
};
