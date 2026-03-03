//
// Copyright 2026 DXOS.org
//

import ErrorStackParser from 'error-stack-parser';
import React from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { mx } from '@dxos/ui-theme';

export { ErrorBoundary, type ErrorBoundaryProps, type FallbackProps } from '@dxos/react-error-boundary';

/**
 * Themed fallback component for `ErrorBoundary`.
 */
export const ErrorFallback = ({ error }: FallbackProps) => {
  const isDev = process.env.NODE_ENV === 'development';

  const message = error instanceof Error ? error.message : String(error);
  const frames = isDev && error instanceof Error ? ErrorStackParser.parse(error) : [];

  return (
    <div role='alert' data-testid='error-boundary-fallback' className='flex flex-col p-4 gap-4 overflow-auto'>
      <h1 className='text-lg text-info-text'>Fatal Error</h1>
      <p>{message}</p>
      {frames.length > 0 && (
        <div className='flex flex-col gap-1'>
          <h2 className='text-xs uppercase text-subdued'>Stack</h2>
          <div className='font-mono text-sm'>
            {frames.map((frame, i) => {
              const href = frame.fileName
                ? toVscodeLink(frame.fileName, frame.lineNumber, frame.columnNumber)
                : undefined;
              const name = frame.functionName ?? '<anonymous>';
              const shortFile = frame.fileName ? toShortFileName(frame.fileName) : undefined;
              return (
                <div
                  key={i}
                  className={mx(
                    'grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-0.5',
                    href && 'cursor-pointer hover:bg-hover-surface',
                  )}
                >
                  {href ? (
                    <a href={href} className='truncate'>
                      {name}
                    </a>
                  ) : (
                    <span className='text-subdued truncate'>{name}</span>
                  )}
                  <span className='text-xs text-subdued truncate'>{shortFile ?? ''}</span>
                  <span className='text-xs text-subdued text-right'>
                    {href ? `${frame.lineNumber}:${frame.columnNumber}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Converts a Vite `/@fs/` URL to a `vscode://` deep link.
 * Returns undefined if the URL cannot be resolved to a local file.
 */
const toVscodeLink = (fileName: string, line?: number, col?: number): string | undefined => {
  try {
    const { pathname } = new URL(fileName);
    if (!pathname.startsWith('/@fs/')) {
      return undefined;
    }
    const localPath = pathname.slice(4); // /@fs/Users/... → /Users/...
    return `vscode://file/${localPath}:${line ?? 1}:${col ?? 1}`;
  } catch {
    return undefined;
  }
};

/**
 * Extracts a short display name from a file URL: just the basename and line number.
 * e.g. `/@fs/Users/.../ErrorFallback.stories.tsx` → `ErrorFallback.stories.tsx`
 */
const toShortFileName = (fileName: string): string | undefined => {
  try {
    const { pathname } = new URL(fileName);
    if (!pathname.startsWith('/@fs/')) {
      return undefined;
    }
    return pathname.split('/').pop();
  } catch {
    return undefined;
  }
};
