//
// Copyright 2024 DXOS.org
//

import React, { CSSProperties } from 'react';
import { type SyntaxHighlighterProps as NaturalSyntaxHighlighterProps } from 'react-syntax-highlighter';
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { coldarkDark as dark, coldarkCold as light } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { ScrollArea, useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

const zeroWidthSpace = '\u200b';

export type SyntaxHighlighterProps = NaturalSyntaxHighlighterProps & {
  fallback?: string;
};

/**
 * NOTE: Using `light-async` version directly from dist to avoid any chance of the heavy one being loaded.
 * The lightweight version will load specific language parsers asynchronously.
 *
 * https://github.com/react-syntax-highlighter/react-syntax-highlighter
 * https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/prism.html
 */
// TODO(burdon): Replace with react-ui-editor (and reuse styles).
export const SyntaxHighlighter = composable<HTMLDivElement, SyntaxHighlighterProps>(
  (
    { children, language = 'text', fallback = zeroWidthSpace, classNames, className, style, ...nativeProps },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();

    return (
      <ScrollArea.Root {...composableProps({ classNames, className })} thin ref={forwardedRef}>
        <ScrollArea.Viewport>
          <div role='none'>
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
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

SyntaxHighlighter.displayName = 'SyntaxHighlighter';

const languages = {
  js: 'javascript',
  ts: 'typescript',
};
