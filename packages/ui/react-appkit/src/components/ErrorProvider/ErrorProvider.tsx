//
// Copyright 2022 DXOS.org
//

import { Circle, Warning } from '@phosphor-icons/react';
import React, { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

import { SystemStatus, ClientContext, type Config } from '@dxos/react-client';
import { useTranslation, Button, DensityProvider } from '@dxos/react-ui';
import { valenceColorText, getSize } from '@dxos/react-ui-theme';
import { captureException } from '@dxos/sentry';
import { type Provider } from '@dxos/util';

import { ResetDialog } from '../ResetDialog';
import { Tooltip } from '../Tooltip';

export interface ErrorContextState {
  errors: Error[];
  addError: (error: Error) => void;
  resetErrors: () => void;
}

export const ErrorContext = createContext<ErrorContextState>({
  errors: [],
  addError: () => {},
  resetErrors: () => {},
});

// TODO(burdon): Override if dev-only?
const logError = (f: string, ...args: any[]) => console.error(f, ...args);

export type ErrorProviderProps = PropsWithChildren<{
  config?: Config | Provider<Promise<Config>>;
  isDev?: boolean;
}>;

export const ErrorProvider = ({ children, config, isDev = true }: ErrorProviderProps) => {
  const { t } = useTranslation('appkit');
  const [errors, setErrors] = useState<Error[]>([]);
  const addError = useCallback((error: Error) => setErrors([error, ...errors]), []);
  const resetErrors = useCallback(() => setErrors([]), []);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const clientContextValue = useContext(ClientContext);

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
      error && addError(error);
      return true; // Prevent default.
    },
    [],
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
      {isDev && (
        <>
          <div role='none' className='fixed bottom-2 right-2'>
            <DensityProvider density='fine'>
              {errors.length ? (
                <Tooltip content={t('caught error message')} tooltipLabelsTrigger>
                  <Button
                    variant='ghost'
                    onClick={() => setErrorDialogOpen(true)}
                    classNames={valenceColorText('warning')}
                  >
                    <Warning weight='duotone' className={getSize(6)} />
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  variant='ghost'
                  classNames={
                    clientContextValue?.status === SystemStatus.ACTIVE
                      ? valenceColorText('success')
                      : !clientContextValue?.status
                      ? 'text-neutral-550'
                      : valenceColorText('error')
                  }
                  onClick={() => setErrorDialogOpen(true)}
                >
                  <Circle weight='fill' className={getSize(3)} />
                </Button>
              )}
            </DensityProvider>
          </div>
          <ResetDialog config={config} errors={errors} open={errorDialogOpen} onOpenChange={setErrorDialogOpen} />
        </>
      )}
    </ErrorContext.Provider>
  );
};

export const useErrors = () => useContext(ErrorContext);
