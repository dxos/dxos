//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';
import { type FallbackProps, ErrorBoundary as NaturalErrorBoundary } from 'react-error-boundary';

import { addEventListener, combine } from '@dxos/async';

import { ErrorFallback } from './ErrorFallback';

export type { FallbackProps };

export type ErrorBoundaryProps = PropsWithChildren<{
  /** Boundary name. */
  name?: string;
  /** Component to render when an error is caught. */
  FallbackComponent?: ComponentType<FallbackProps>;
  /** Render function to call when an error is caught. Takes precedence over FallbackComponent. */
  fallbackRender?: (props: FallbackProps) => ReactNode;
  /** Array of values that, when changed, reset the error boundary. */
  resetKeys?: any[];
  /** Whether to handle errors globally. */
  events?: { unhandledrejection?: boolean; error?: boolean };
  /** Callback fired when an error is caught. */
  onError?: (error: Error, info: { boundary?: string; componentStack?: string | null }) => void;
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
  name,
  FallbackComponent,
  fallbackRender,
  resetKeys,
  events,
  onError,
  onReset,
}: ErrorBoundaryProps) => {
  const [error, setError] = useState<Error>();
  useEffect(() => {
    return combine(
      events?.unhandledrejection &&
        addEventListener(window, 'unhandledrejection', (event: PromiseRejectionEvent) => {
          recordErrorForSmokeTests(event.reason);
          onError?.(event.reason, { boundary: name, componentStack: null });
          setError(event.reason);
        }),
      events?.error &&
        addEventListener(window, 'error', (event: ErrorEvent) => {
          recordErrorForSmokeTests(event.error);
          onError?.(event.error, { boundary: name, componentStack: null });
          setError(event.error);
        }),
    );
  }, [name, events]);

  const handleError = (error: Error, info: { componentStack?: string | null }) => {
    recordErrorForSmokeTests(error);
    onError?.(error, { boundary: name, ...info });
  };

  const handleReset = () => {
    setError(undefined);
    onReset?.();
  };

  const fallbackProps = fallbackRender ? { fallbackRender } : { FallbackComponent: FallbackComponent ?? ErrorFallback };

  // Throw re-throws the global event error inside NaturalErrorBoundary so the boundary
  // handles it uniformly — avoids unmounting the entire children subtree (including ThemeProvider).
  return (
    <NaturalErrorBoundary {...fallbackProps} onError={handleError} onReset={handleReset} resetKeys={resetKeys}>
      {error !== undefined ? <Throw error={error} /> : children}
    </NaturalErrorBoundary>
  );
};

/** Re-throws an error inside the React reconciler so an ancestor ErrorBoundary can catch it. */
const Throw = ({ error }: { error: Error }) => {
  throw error;
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
