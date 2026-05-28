//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';
import type { FallbackProps } from 'react-error-boundary';

/**
 * Theme-independent default fallback component for `ErrorBoundary`.
 * Uses inline styles (no tailwind or theme dependencies).
 */
export const ErrorFallback = ({ error }: FallbackProps) => {
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
      <h1 style={{ margin: '0.5rem 0', fontSize: '1.2rem', color: 'teal' }}>Fatal Error</h1>
      <p>{message}</p>
      <button
        type='button'
        onClick={handleCopy}
        style={{
          marginTop: '0.5rem',
          padding: '0.25rem 0.75rem',
          fontSize: '0.875rem',
          color: 'teal',
          background: 'transparent',
          border: '1px solid teal',
          borderRadius: '0.375rem',
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied' : 'Copy error details'}
      </button>
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
