//
// Copyright 2024 DXOS.org
//

import React, { Children } from 'react';
import { type SyntaxHighlighterProps as NaturalSyntaxHighlighterProps } from 'react-syntax-highlighter';
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { coldarkDark as dark, coldarkCold as light } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Clipboard, useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

const zeroWidthSpace = '\u200b';

const languages = {
  js: 'javascript',
  ts: 'typescript',
};

export type SyntaxHighlighterProps = Pick<
  NaturalSyntaxHighlighterProps,
  | 'language'
  | 'renderer'
  | 'showLineNumbers'
  | 'showInlineLineNumbers'
  | 'startingLineNumber'
  | 'wrapLines'
  | 'wrapLongLines'
  | 'PreTag'
> & {
  themeStyle?: NaturalSyntaxHighlighterProps['style'];
  fallback?: string;
  copyButton?: boolean;
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
      classNames,
      className,
      children,
      role,
      style,
      themeStyle,
      language = 'text',
      fallback = zeroWidthSpace,
      copyButton,
      ...nativeProps
    },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();
    const source = Children.toArray(children).join('') || fallback;

    const hasCustomTheme = themeStyle && typeof themeStyle === 'object' && Object.keys(themeStyle).length > 0;
    const prismTheme = hasCustomTheme ? themeStyle : themeMode === 'dark' ? dark : light;

    return (
      <div
        {...composableProps(
          { classNames, className, role, style },
          {
            role: 'none',
            classNames: copyButton && 'relative group',
          },
        )}
        ref={forwardedRef}
      >
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

        {copyButton && (
          <div
            role='none'
            className='pointer-events-none absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100'
          >
            <Clipboard.Provider>
              <Clipboard.IconButton
                value={source}
                variant='ghost'
                size={4}
                classNames='pointer-events-auto aspect-square rounded-sm'
              />
            </Clipboard.Provider>
          </div>
        )}
      </div>
    );
  },
);

SyntaxHighlighter.displayName = 'SyntaxHighlighter';
