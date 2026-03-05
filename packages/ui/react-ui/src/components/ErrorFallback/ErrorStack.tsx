//
// Copyright 2026 DXOS.org
//

import ErrorStackParser from 'error-stack-parser';
import React from 'react';

import { mx } from '@dxos/ui-theme';

type LocalFrame = { href: string; fileName: string };

/**
 * Renders a parsed error stack trace with tree connector symbols and clickable vscode:// links for local frames.
 */
export const ErrorStack = ({ error }: { error: Error }) => {
  const frames = ErrorStackParser.parse(error);

  return (
    <div className='font-mono text-sm'>
      {frames.map((frame, i) => {
        const isLast = i === frames.length - 1;
        const local = frame.fileName
          ? parseLocalFrame(frame.fileName, frame.lineNumber, frame.columnNumber)
          : undefined;
        const name = frame.functionName ?? '<anonymous>';
        return (
          <div
            key={i}
            className={mx(
              'grid grid-cols-[16px_1fr_auto_auto] items-stretch gap-x-2',
              local && 'cursor-pointer hover:bg-hover-surface',
            )}
          >
            {/* Tree connector: vertical line full-height + horizontal branch at midpoint */}
            <div className='relative'>
              <div
                className={mx(
                  'absolute left-1/2 -translate-x-1/2 w-px bg-neutral-500',
                  isLast ? 'top-0 h-1/2' : 'inset-y-0',
                )}
              />
              <div className='absolute top-1/2 -translate-y-1/2 left-1/2 right-0 h-px bg-neutral-500' />
            </div>
            {local ? (
              <a href={local.href} className='truncate self-center'>
                {name}
              </a>
            ) : (
              <span className='text-subdued truncate self-center'>{name}</span>
            )}
            <span className='text-xs text-subdued truncate self-center'>{local?.fileName ?? ''}</span>
            <span className='text-xs text-subdued text-right self-center'>
              {local ? `${frame.lineNumber}:${frame.columnNumber}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

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
