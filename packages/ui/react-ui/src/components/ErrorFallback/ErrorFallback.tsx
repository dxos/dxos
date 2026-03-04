//
// Copyright 2026 DXOS.org
//

import ErrorStackParser from 'error-stack-parser';
import React, { type PropsWithChildren } from 'react';
import { type FallbackProps } from 'react-error-boundary';

import { mx } from '@dxos/ui-theme';
import { safeStringify } from '@dxos/util';

export { ErrorBoundary, type ErrorBoundaryProps, type FallbackProps } from '@dxos/react-error-boundary';

export type ErrorFallbackProps = PropsWithChildren<Pick<FallbackProps, 'error'> & { title?: string; data?: any }>;

/**
 * Themed fallback component for `ErrorBoundary`.
 */
export const ErrorFallback = ({ children, error, title, data }: ErrorFallbackProps) => {
  const isDev = process.env.NODE_ENV === 'development';

  const message = error instanceof Error ? error.message : String(error);
  const frames = isDev && error instanceof Error ? ErrorStackParser.parse(error) : [];

  return (
    <div role='alert' data-testid='error-boundary-fallback' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-lg text-info-text'>{title ?? 'Runtime Error'}</h1>
      {data && (
        <>
          <h2 className='text-xs mt-2 uppercase'>Data</h2>
          <pre className='overflow-x-auto text-xs text-subdued'>{safeStringify(data, undefined, 2)}</pre>
        </>
      )}
      <p>{message}</p>
      {frames.length > 0 && (
        <div className='flex flex-col gap-1'>
          <h2 className='text-xs uppercase text-subdued'>Stack</h2>
          <div className='font-mono text-sm'>
            {frames.map((frame, i) => {
              const local = frame.fileName
                ? parseLocalFrame(frame.fileName, frame.lineNumber, frame.columnNumber)
                : undefined;
              const name = frame.functionName ?? '<anonymous>';
              return (
                <div
                  key={i}
                  className={mx(
                    'grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-0.5',
                    local && 'cursor-pointer hover:bg-hover-surface',
                  )}
                >
                  {local ? (
                    <a href={local.href} className='truncate'>
                      {name}
                    </a>
                  ) : (
                    <span className='text-subdued truncate'>{name}</span>
                  )}
                  <span className='text-xs text-subdued truncate'>{local?.fileName ?? ''}</span>
                  <span className='text-xs text-subdued text-right'>
                    {local ? `${frame.lineNumber}:${frame.columnNumber}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

type LocalFrame = { href: string; fileName: string };

/**
 * Parses a Vite `/@fs/` URL into a `vscode://` deep link and short filename.
 * Returns undefined if the URL cannot be resolved to a local file.
 */
const parseLocalFrame = (fileUrl: string, line?: number, col?: number): LocalFrame | undefined => {
  try {
    const { pathname } = new URL(fileUrl);
    if (!pathname.startsWith('/@fs/')) {
      return undefined;
    }
    const localPath = pathname.slice(4); // /@fs/Users/... → /Users/...
    return {
      href: `vscode://file/${localPath}:${line ?? 1}:${col ?? 1}`,
      fileName: pathname.split('/').pop() ?? localPath,
    };
  } catch {
    return undefined;
  }
};
