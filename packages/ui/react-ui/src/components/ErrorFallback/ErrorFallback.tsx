//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { type PropsWithChildren } from 'react';
import { type FallbackProps } from 'react-error-boundary';

import { safeStringify } from '@dxos/util';

import { translationKey } from '#translations';

import { useTranslation } from '../../providers/ThemeProvider/TranslationsContext.ts';
import * as SystemIconButton from '../Button/SystemIconButton.tsx';
import * as ErrorStack from './ErrorStack.tsx';
type ErrorFallbackProps = PropsWithChildren<Pick<FallbackProps, 'error'> & { title?: string; data?: any }>;

/**
 * Themed fallback component for `ErrorBoundary`.
 */
const ErrorFallback = ({ children, error, title, data }: ErrorFallbackProps) => {
  const { t } = useTranslation(translationKey);
  const isDev = process.env.NODE_ENV === 'development';
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div role='alert' data-testid='error-boundary-fallback' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-lg text-info-text'>{title ?? 'Runtime Error'}</h1>
      <p>{message}</p>

      {isDev && error instanceof Error && (
        <Section title='Stack' onCopy={() => (error instanceof Error ? (error.stack ?? error.message) : String(error))}>
          <ErrorStack.Root error={error} />
        </Section>
      )}

      {data && (
        <Section title='Data' onCopy={() => JSON.stringify(data, undefined, 2)}>
          <pre className='overflow-x-auto text-xs'>{safeStringify(data, undefined, 2)}</pre>
        </Section>
      )}

      {children}
    </div>
  );
};

const Section = ({ children, title, onCopy }: PropsWithChildren<{ title?: string; onCopy?: () => string }>) => {
  return (
    <div className='flex flex-col gap-1'>
      {onCopy && (
        <div>
          <SystemIconButton.Clipboard classNames='text-xs uppercase' label={title ?? 'Copy'} size={5} onCopy={onCopy} />
        </div>
      )}
      {children}
    </div>
  );
};

export { ErrorFallback as Root };
export type { ErrorFallbackProps as RootProps };
export { ErrorBoundary, type ErrorBoundaryProps, type FallbackProps } from '@dxos/react-error-boundary';
export { type ParsedStackFrame, parseCaptureOwnerStack } from './parse-stack.ts';
