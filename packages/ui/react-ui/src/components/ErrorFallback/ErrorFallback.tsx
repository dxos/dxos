//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';
import { type FallbackProps } from 'react-error-boundary';

import { safeStringify } from '@dxos/util';

import { ErrorStack } from './ErrorStack';

export type ErrorFallbackProps = PropsWithChildren<Pick<FallbackProps, 'error'> & { title?: string; data?: any }>;

/**
 * Themed fallback component for `ErrorBoundary`.
 */
export const ErrorFallback = ({ children, error, title, data }: ErrorFallbackProps) => {
  const isDev = process.env.NODE_ENV === 'development';
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div role='alert' data-testid='error-boundary-fallback' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-lg text-info-text'>{title ?? 'Runtime Error'}</h1>
      <p>{message}</p>

      {isDev && error instanceof Error && (
        <Section
          title='Stack'
          onClick={() => {
            const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
            void navigator.clipboard.writeText(text);
          }}
        >
          <ErrorStack error={error} />
        </Section>
      )}

      {data && (
        <Section
          title='Data'
          onClick={() => {
            void navigator.clipboard.writeText(JSON.stringify(data, undefined, 2));
          }}
        >
          <pre className='overflow-x-auto text-xs'>{safeStringify(data, undefined, 2)}</pre>
        </Section>
      )}

      {children}
    </div>
  );
};

const Section = ({ children, title, onClick }: PropsWithChildren<{ title?: string; onClick?: () => void }>) => {
  return (
    <div className='flex flex-col gap-1'>
      {onClick && (
        <button
          type='button'
          onClick={onClick}
          className='flex items-center gap-1 text-xs text-subdued hover:text-primary-500 transition-colors'
          title={`Copy ${title}`}
        >
          <h2 className='text-xs uppercase text-subdued'>{title}</h2>
        </button>
      )}
      {children}
    </div>
  );
};
