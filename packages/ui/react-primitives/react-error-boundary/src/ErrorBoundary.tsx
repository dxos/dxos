//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NaturalErrorBoundary } from 'react-error-boundary';

import { addEventListener, combine } from '@dxos/async';

import { ErrorFallback } from './ErrorFallback';

export type { FallbackProps };

export type ErrorBoundaryProps = PropsWithChildren<{
  /** Component to render when an error is caught. */
  FallbackComponent?: ComponentType<FallbackProps>;
  /** Render function to call when an error is caught. Takes precedence over FallbackComponent. */
  fallbackRender?: (props: FallbackProps) => ReactNode;
  /** Array of values that, when changed, reset the error boundary. */
  resetKeys?: any[];
  /** Callback fired when an error is caught. */
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
  /** Callback fired when the error boundary resets. */
  onReset?: () => void;
}>;

/**
 * Error boundary that catches both React render errors and unhandled promise rejections.
 * The unhandledrejection listener lives in the parent component so it remains active
 * even after the fallback renders (unlike a child-based approach where the listener
 * unmounts when the error boundary triggers).
 */
export const ErrorBoundary = ({
  children,
  FallbackComponent,
  fallbackRender,
  resetKeys,
  onError,
  onReset,
}: ErrorBoundaryProps) => {
  const [error, setError] = useState<Error>();
  useEffect(() => {
    return combine(
      addEventListener(window, 'unhandledrejection', (event: PromiseRejectionEvent) => {
        recordErrorForSmokeTests(event.reason);
        setError(event.reason);
      }),
      addEventListener(window, 'error', (event: ErrorEvent) => {
        recordErrorForSmokeTests(event.error);
        setError(event.error);
      }),
    );
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

  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    recordErrorForSmokeTests(error);
    onError?.(error, info);
  };

  const fallbackProps = fallbackRender ? { fallbackRender } : { FallbackComponent: FallbackComponent ?? ErrorFallback };

  return (
    <NaturalErrorBoundary {...fallbackProps} onError={handleError} onReset={onReset} resetKeys={resetKeys}>
      {children}
    </NaturalErrorBoundary>
  );
};

/**
 * Record error for storybook smoke test detection.
 * Persists even if the component re-renders away.
 */
const recordErrorForSmokeTests = (error: unknown) => {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win.__ERROR_BOUNDARY_ERRORS__) {
      win.__ERROR_BOUNDARY_ERRORS__ = [];
    }
    const message = error instanceof Error ? error.message : String(error);
    win.__ERROR_BOUNDARY_ERRORS__.push(message);
  }
};
