//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import { useEffect } from 'react';

import { useFrameworkContext } from './context';

const logError = debug('dxos:react-framework:error');

/**
 * Global error handling.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
 */
export const useError = (): [Error | undefined, () => void] => {
  const log = debug.enabled('dxos:react-framework:error') ? logError : console.error;

  // TODO(burdon): Post errors to montioring service.
  const { errors: [error, setError] } = useFrameworkContext();

  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error?: Error) => {
      log('onerror', message);
      setError(error);
      return true; // Prevent default.
    };

    const listener = (event: any) => {
      log('unhandledrejection', event.reason);
      setError(event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', listener);
    return () => {
      window.removeEventListener('unhandledrejection', listener as any);
    };
  }, []);

  return [error, () => setError(undefined)];
};
