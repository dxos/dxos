//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type ReactNode, useEffect, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NaturalErrorBoundary } from 'react-error-boundary';

import { addEventListener } from '@dxos/async';

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
// TODO(burdon): Integrate with telemetry?
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
    return addEventListener(window, 'unhandledrejection', (event: PromiseRejectionEvent) => {
      setError(event.reason);
    });
  }, []);

  if (error !== undefined) {
    const props: FallbackProps = {
      error,
      resetErrorBoundary: () => setError(undefined),
    };

    if (fallbackRender) {
      return <>{fallbackRender(props)}</>;
    }

    const Fallback = FallbackComponent ?? ErrorFallback;
    return <Fallback {...props} />;
  }

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
          name: undefined,
          message: String(error),
          stack: undefined,
        };

  // Record error for smoke test detection (persists even if component re-renders away).
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win.__ERROR_BOUNDARY_ERRORS__) {
      win.__ERROR_BOUNDARY_ERRORS__ = [];
    }
    win.__ERROR_BOUNDARY_ERRORS__.push(message);
  }

  return (
    <div
      role='alert'
      // NOTE: Storybook smoke tests use this to detect errors.
      data-testid='error-boundary-fallback'
      className='flex flex-col p-4 gap-4 overflow-auto'
    >
      <h1 className='text-lg text-error-text'>Fatal Error</h1>
      {name && <p>{name}</p>}
      <p>{message}</p>
      {stack && <pre className='whitespace-pre-wrap text-sm text-subdued'>{stack}</pre>}
    </div>
  );
};
