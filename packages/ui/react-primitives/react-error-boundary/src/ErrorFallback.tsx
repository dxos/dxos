//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useState } from 'react';
import type { FallbackProps } from 'react-error-boundary';

export type ErrorFallbackProps = FallbackProps & {
  /** Extra actions rendered next to the built-in "Copy" button, e.g. a "Download logs" button. */
  actions?: ReactNode;
};

/**
 * Theme-independent default fallback component for `ErrorBoundary`.
 * Uses inline styles (no tailwind or theme dependencies).
 */
export const ErrorFallback = ({ error, actions }: ErrorFallbackProps) => {
  const isDev = process.env.NODE_ENV === 'development';
  const { message, stack } = error instanceof Error ? error : { message: String(error) };
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) {
      return;
    }
    const text = stack ?? message;
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

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
      <div className='flex items-center justify-between'>
        <h1 style={{ margin: '0.5rem 0', fontSize: '1.2rem', color: 'teal' }}>Fatal Error</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type='button'
            onClick={handleCopy}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              background: 'transparent',
              border: '1px solid #888888',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {actions}
        </div>
      </div>
      <p>{message}</p>
      {isDev && stack && (
        <pre
          style={{
            wordBreak: 'break-all',
            overflow: 'auto',
            fontSize: '1rem',
            whiteSpace: 'pre-wrap',
            color: '#888888',
          }}
        >
          {stack}
        </pre>
      )}
    </div>
  );
};
