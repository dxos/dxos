//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties } from 'react';
import { type SyntaxHighlighterProps as NativeSyntaxHighlighterProps } from 'react-syntax-highlighter';
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { coldarkDark as dark, coldarkCold as light } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

const zeroWidthSpace = '\u200b';

const languages = {
  js: 'javascript',
  ts: 'typescript',
};

export type SyntaxHighlighterProps = NativeSyntaxHighlighterProps & {
  fallback?: string;
};

/**
 * Inline, non-scrolling wrapper around `react-syntax-highlighter`.
 *
 * Use directly for small snippets (e.g. inside markdown code blocks).
 * For scrollable panels, compose with `Syntax.Viewport`.
 *
 * NOTE: Using `light-async` version directly from dist to avoid any chance of the heavy one being loaded.
 * The lightweight version will load specific language parsers asynchronously.
 *
 * https://github.com/react-syntax-highlighter/react-syntax-highlighter
 * https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/prism.html
 */
export const SyntaxHighlighter = composable<HTMLDivElement, SyntaxHighlighterProps>(
  (
    { children, language = 'text', fallback = zeroWidthSpace, classNames, className, style, ...nativeProps },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();

    return (
      <div {...composableProps({ classNames, className })} role='none' ref={forwardedRef}>
        <NativeSyntaxHighlighter
          language={languages[language as keyof typeof languages] || language}
          style={(style as { [key: string]: CSSProperties }) ?? (themeMode === 'dark' ? dark : light)}
          customStyle={{
            background: 'unset',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            margin: 0,
          }}
          {...nativeProps}
        >
          {/* Non-empty fallback prevents collapse. */}
          {children || fallback}
        </NativeSyntaxHighlighter>
      </div>
    );
  },
);

SyntaxHighlighter.displayName = 'SyntaxHighlighter';
