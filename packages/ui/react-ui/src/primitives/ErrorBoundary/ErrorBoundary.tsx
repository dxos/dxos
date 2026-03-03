//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type ReactNode, useEffect, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NaturalErrorBoundary } from 'react-error-boundary';

export type { FallbackProps };

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** Component to render when an error is caught. */
  FallbackComponent?: ComponentType<FallbackProps>;
  /** Render function to call when an error is caught. Takes precedence over FallbackComponent. */
  fallbackRender?: (props: FallbackProps) => ReactNode;
  /** Callback fired when an error is caught. */
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
  /** Callback fired when the error boundary resets. */
  onReset?: () => void;
  /** Array of values that, when changed, reset the error boundary. */
  resetKeys?: any[];
};

/**
 * Standard error boundary component.
 * https://reactjs.org/docs/error-boundaries.html
 * https://github.com/bvaughn/react-error-boundary
 */
export const ErrorBoundary = ({
  children,
  FallbackComponent,
  fallbackRender,
  onError,
  onReset,
  resetKeys,
}: ErrorBoundaryProps) => {
  const [error, setError] = useState<Error>();
  useEffect(() => {
    const handleError = (event: PromiseRejectionEvent) => {
      setError(event.reason);
    };

    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);

  if (error) {
    return <ErrorFallback error={error} resetErrorBoundary={() => setError(undefined)} />;
  }

  // react-error-boundary uses a discriminated union for fallback props;
  // only one of FallbackComponent or fallbackRender can be passed.
  const fallbackProps = fallbackRender ? { fallbackRender } : { FallbackComponent: FallbackComponent ?? ErrorFallback };

  return (
    <NaturalErrorBoundary {...fallbackProps} onError={onError} onReset={onReset} resetKeys={resetKeys}>
      {children}
    </NaturalErrorBoundary>
  );
};

/**
 * Default fallback component for `ErrorBoundary`.
 */
export const ErrorFallback = ({ error }: FallbackProps) => {
  const { name, message, stack } =
    error instanceof Error
      ? error
      : {
          message: String(error),
          stack: undefined,
        };

  return (
    <div role='alert' data-testid='error-boundary-fallback' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-lg text-error-text'>Fatal Error</h1>
      {name && <p>{name}</p>}
      <p>{message}</p>
      {stack && <pre className='whitespace-pre-wrap text-sm text-subdued'>{stack}</pre>}
    </div>
  );
};
