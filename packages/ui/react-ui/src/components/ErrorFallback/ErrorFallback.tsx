//
// Copyright 2026 DXOS.org
//

import React from 'react';
import type { FallbackProps } from 'react-error-boundary';

export { ErrorBoundary, type ErrorBoundaryProps, type FallbackProps } from '@dxos/react-error-boundary';

/**
 * Themed fallback component for `ErrorBoundary`.
 */
export const ErrorFallback = ({ error }: FallbackProps) => {
  const { message, stack } =
    error instanceof Error
      ? error
      : {
          message: String(error),
          stack: undefined,
        };

  return (
    <div role='alert' data-testid='error-boundary-fallback' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-lg text-error-text'>Fatal Error</h1>
      <p>{message}</p>
      {stack && <pre className='whitespace-pre-wrap text-sm text-subdued'>{stack}</pre>}
    </div>
  );
};
