//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties } from 'react';
import { type SyntaxHighlighterProps as NativeSyntaxHighlighterProps } from 'react-syntax-highlighter';
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { coldarkDark as dark, coldarkCold as light } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Clipboard, useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

const zeroWidthSpace = '\u200b';

const languages = {
  js: 'javascript',
  ts: 'typescript',
};

export type SyntaxHighlighterProps = NativeSyntaxHighlighterProps & {
  fallback?: string;
  showCopyButton?: boolean;
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
    {
      children,
      language = 'text',
      fallback = zeroWidthSpace,
      showCopyButton,
      classNames,
      className,
      style,
      ...nativeProps
    },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();
    const source = React.Children.toArray(children).join('') || fallback;

    // The `style` prop here is a Prism theme (a token → CSSProperties map), not a React style.
    // `composableProps` from parent composites may inject `style: {}` for DOM merging; treat it
    // as "no custom theme" so the default theme still applies.
    const hasCustomTheme = style && typeof style === 'object' && Object.keys(style).length > 0;
    const prismTheme = hasCustomTheme
      ? (style as { [key: string]: CSSProperties })
      : themeMode === 'dark'
        ? dark
        : light;

    return (
      <div
        {...composableProps({ classNames, className }, { classNames: showCopyButton && 'relative group' })}
        role='none'
        ref={forwardedRef}
      >
        {showCopyButton && (
          <Clipboard.Provider>
            <Clipboard.IconButton
              value={source}
              variant='ghost'
              size={4}
              classNames='absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100'
            />
          </Clipboard.Provider>
        )}
        <NativeSyntaxHighlighter
          language={languages[language as keyof typeof languages] || language}
          style={prismTheme}
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
          {source}
        </NativeSyntaxHighlighter>
      </div>
    );
  },
);

SyntaxHighlighter.displayName = 'SyntaxHighlighter';
