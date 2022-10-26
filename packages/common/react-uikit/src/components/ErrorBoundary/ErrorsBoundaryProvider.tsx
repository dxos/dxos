//
// Copyright 2022 DXOS.org
//
import cx from 'classnames';
import debug from 'debug';
import { Warning } from 'phosphor-react';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, valenceColorText, defaultFocus } from '@dxos/react-ui';

import { FatalErrorBoundary } from './FatalErrorBoundary';

export interface ErrorsContextState {
  errors: Error[];
  addError: (error: Error) => void;
  resetErrors: () => void;
}

export const ErrorsContext = createContext<ErrorsContextState>({
  errors: [],
  addError: () => {},
  resetErrors: () => {}
});

const error = debug('dxos:react-toolkit:error');

// TODO(burdon): Override if dev-only?
const logError = (f: string, ...args: any[]) => (error.enabled ? error(f, ...args) : console.error(f, ...args));

export const ErrorsBoundaryProvider = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Error[]>([]);
  const addError = useCallback((error: Error) => setErrors([error, ...errors]), []);
  const resetErrors = useCallback(() => setErrors([]), []);

  const onUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    logError('unhandledrejection', event.reason);
    addError(event.reason);
    event.preventDefault();
  }, []);

  const onWindowError = useCallback<Exclude<typeof window.onerror, null>>(
    (message, source, lineno, colno, error?: Error) => {
      logError('onerror', message);
      addError(error!);
      return true; // Prevent default.
    },
    []
  );

  // Register global error handlers.
  // TODO(burdon): Post errors to monitoring service.
  useEffect(() => {
    window.onerror = onWindowError;
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.onerror = null;
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return (
    <ErrorsContext.Provider value={{ errors, addError, resetErrors }}>
      <FatalErrorBoundary>{children}</FatalErrorBoundary>
      <div role='none' className={cx('fixed bottom-4 right-4', valenceColorText('warning'))}>
        {!!errors.length && (
          <Tooltip content={t('caught error message')}>
            <Warning tabIndex={0} weight='duotone' className={cx('w-6 h-6 rounded-md', defaultFocus)} />
          </Tooltip>
        )}
      </div>
    </ErrorsContext.Provider>
  );
};

export const useErrors = () => useContext(ErrorsContext);
