//
// Copyright 2026 DXOS.org
//

import React from 'react';
import type { FallbackProps } from 'react-error-boundary';

/**
 * Theme-independent default fallback component for `ErrorBoundary`.
 * Uses inline styles (no tailwind or theme dependencies).
 */
export const ErrorFallback = ({ error }: FallbackProps) => {
  const isDev = process.env.NODE_ENV === 'development';
  const { message, stack } = error instanceof Error ? error : { message: String(error) };

  return (
    <div
      role='alert'
      data-testid='error-boundary-fallback'
      style={{
        margin: '1rem',
        padding: '1rem',
        overflow: 'hidden',
        border: '4px solid teal',
        borderRadius: '1rem',
      }}
    >
      <h1 style={{ margin: '0.5rem 0', fontSize: '1.2rem', color: 'teal' }}>Fatal Error</h1>
      <p>{message}</p>
      {isDev && stack && (
        <pre style={{ overflow: 'auto', fontSize: '1rem', whiteSpace: 'pre-wrap', color: '#888888' }}>{stack}</pre>
      )}
    </div>
  );
};
