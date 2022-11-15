//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Warning } from 'phosphor-react';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

import { Tooltip, valenceColorText, defaultFocus, useTranslation } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';

export interface ErrorContextState {
  errors: Error[];
  addError: (error: Error) => void;
  resetErrors: () => void;
}

export const ErrorContext = createContext<ErrorContextState>({
  errors: [],
  addError: () => {},
  resetErrors: () => {}
});

// TODO(burdon): Override if dev-only?
const logError = (f: string, ...args: any[]) => console.error(f, ...args);

export const ErrorProvider = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Error[]>([]);
  const addError = useCallback((error: Error) => setErrors([error, ...errors]), []);
  const resetErrors = useCallback(() => setErrors([]), []);

  const onUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    captureException(event.reason);
    logError('unhandledrejection', event.reason);
    addError(event.reason);
    event.preventDefault();
  }, []);

  const onWindowError = useCallback<Exclude<typeof window.onerror, null>>(
    (message, source, lineno, colno, error?: Error) => {
      captureException(error);
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
    <ErrorContext.Provider value={{ errors, addError, resetErrors }}>
      {children}
      <div role='none' className={cx('fixed bottom-4 right-4', valenceColorText('warning'))}>
        {/* TODO(wittjosiah): Render this warning conditionally based on a prop (e.g., isInternalUser?). */}
        {!!errors.length && (
          <Tooltip content={t('caught error message')}>
            <Warning tabIndex={0} weight='duotone' className={cx('w-6 h-6 rounded-md', defaultFocus)} />
          </Tooltip>
        )}
      </div>
    </ErrorContext.Provider>
  );
};

export const useErrors = () => useContext(ErrorContext);
