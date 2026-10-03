//
// Copyright 2026 DXOS.org
//

import ErrorStackParser from 'error-stack-parser';
import React, { type PropsWithChildren } from 'react';
import { type FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';
import { safeStringify } from '@dxos/util';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { SystemButton } from '../SystemButton/index.ts';
import { type ParsedStackFrame } from './parse-stack.ts';

//
// ErrorFallback
//

export type ErrorFallbackProps = ThemedClassName<
  PropsWithChildren<
    Pick<FallbackProps, 'error'> & {
      /** Heading above the message; the translated "Runtime Error" by default. */
      title?: string;
      /** Context shown as JSON under a copyable `Data` section. */
      data?: unknown;
    }
  >
>;

/**
 * Fallback for an `ErrorBoundary`: a heading, the message, then (in development) the parsed stack and any `data`, each
 * under a button that copies it.
 */
export const ErrorFallback = ({ classNames, children, error, title, data }: ErrorFallbackProps) => {
  const { t } = useTranslation(translationKey);
  const isDev = process.env.NODE_ENV === 'development';
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div
      role='alert'
      data-testid='error-boundary-fallback'
      data-scope='error-fallback'
      data-part='root'
      className={mx(recipes.errorFallback(), classNames)}
    >
      <h1 data-scope='error-fallback' data-part='title' className={recipes.errorFallbackTitle()}>
        {title ?? t('error-fallback.title.label')}
      </h1>
      <p data-scope='error-fallback' data-part='message' className={recipes.errorFallbackMessage()}>
        {message}
      </p>

      {isDev && error instanceof Error && (
        <ErrorFallbackSection title={t('error-fallback.stack.label')} onCopy={() => error.stack ?? error.message}>
          <ErrorStack error={error} />
        </ErrorFallbackSection>
      )}

      {data !== undefined && (
        <ErrorFallbackSection title={t('error-fallback.data.label')} onCopy={() => JSON.stringify(data, undefined, 2)}>
          <pre data-scope='error-fallback' data-part='data' className={recipes.errorFallbackData()}>
            {safeStringify(data, undefined, 2)}
          </pre>
        </ErrorFallbackSection>
      )}

      {children}
    </div>
  );
};

ErrorFallback.displayName = 'ErrorFallback';

const ErrorFallbackSection = ({
  children,
  title,
  onCopy,
}: PropsWithChildren<{ title: string; onCopy: () => string }>) => (
  <section data-scope='error-fallback' data-part='section' className={recipes.errorFallbackSection()}>
    <SystemButton.Clipboard variant='ghost' iconOnly={false} label={title} onCopy={onCopy} />
    {children}
  </section>
);

//
// ErrorStack
//

/** The parts of a parsed frame the stack shows; `parseCaptureOwnerStack` and `error-stack-parser` frames qualify. */
export type ErrorStackFrame = Pick<ParsedStackFrame, 'functionName' | 'fileName' | 'lineNumber' | 'columnNumber'>;

export type ErrorStackProps = ThemedClassName<{
  /** When set, these frames are shown instead of parsing `error`. */
  frames?: ErrorStackFrame[];
  /** Used when `frames` is omitted. */
  error?: Error;
}>;

/**
 * A parsed stack trace as a tree of frames; frames served from the workspace (Vite `/@fs/` URLs) link to the source
 * line in VS Code.
 */
export const ErrorStack = ({ classNames, error, frames: framesProp }: ErrorStackProps) => {
  const frames: ErrorStackFrame[] = framesProp ?? (error ? ErrorStackParser.parse(error) : []);
  if (frames.length === 0) {
    return null;
  }

  return (
    <ol data-scope='error-stack' data-part='root' className={mx(recipes.errorStack(), classNames)}>
      {frames.map((frame, index) => {
        const local = frame.fileName
          ? parseLocalFrame(frame.fileName, frame.lineNumber, frame.columnNumber)
          : undefined;
        const functionName = frame.functionName ?? '<anonymous>';
        return (
          <li
            key={index}
            data-scope='error-stack'
            data-part='frame'
            data-local={local ? '' : undefined}
            className={recipes.errorStackFrame()}
          >
            {local ? (
              <a href={local.href} className={recipes.errorStackLink()}>
                {functionName}
              </a>
            ) : (
              <span className={recipes.errorStackFunction()}>{functionName}</span>
            )}
            <span className={recipes.errorStackFile()}>{local?.fileName ?? ''}</span>
            <span className={recipes.errorStackLine()}>{local ? `${frame.lineNumber}:${frame.columnNumber}` : ''}</span>
          </li>
        );
      })}
    </ol>
  );
};

ErrorStack.displayName = 'ErrorStack';

/** A stack frame resolved to a workspace source location. */
type LocalFrame = { href: string; fileName: string };

/** Resolves a Vite `/@fs/` URL to a `vscode://` deep link and a path relative to `packages/`. */
const parseLocalFrame = (fileUrl: string, line?: number, column?: number): LocalFrame | undefined => {
  try {
    const { pathname } = new URL(fileUrl);
    if (!pathname.startsWith('/@fs/')) {
      return undefined;
    }

    const localPath = pathname.slice('/@fs'.length);
    const packagesIndex = localPath.indexOf('/packages/');
    return {
      href: `vscode://file/${localPath}:${line ?? 1}:${column ?? 1}`,
      fileName: packagesIndex === -1 ? localPath : localPath.substring(packagesIndex + '/packages/'.length),
    };
  } catch {
    return undefined;
  }
};
