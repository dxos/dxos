//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { type SyntaxHighlighterProps as NaturalSyntaxHighlighterProps } from 'react-syntax-highlighter';
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { coldarkDark as dark, coldarkCold as light } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { ScrollArea, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const zeroWidthSpace = '\u200b';

export type SyntaxHighlighterProps = ThemedClassName<
  NaturalSyntaxHighlighterProps & {
    fallback?: string;
  }
>;

/**
 * NOTE: Using `light-async` version directly from dist to avoid any chance of the heavy one being loaded.
 * The lightweight version will load specific language parsers asynchronously.
 *
 * https://github.com/react-syntax-highlighter/react-syntax-highlighter
 * https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/prism.html
 */
// TODO(burdon): Replace with react-ui-editor (and reuse styles).
export const SyntaxHighlighter = ({
  classNames,
  children,
  language = 'text',
  fallback = zeroWidthSpace,
  ...props
}: SyntaxHighlighterProps) => {
  const { themeMode } = useThemeContext();

  return (
    <ScrollArea.Root thin classNames={mx('p1', classNames)}>
      <ScrollArea.Viewport>
        <div role='none'>
          <NativeSyntaxHighlighter
            language={languages[language as keyof typeof languages] || language}
            style={themeMode === 'dark' ? dark : light}
            customStyle={{
              background: 'unset',
              border: 'none',
              boxShadow: 'none',
              padding: 0,
              margin: 0,
            }}
            {...props}
          >
            {/* Non-empty fallback prevents collapse. */}
            {children || fallback}
          </NativeSyntaxHighlighter>
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const languages = {
  js: 'javascript',
  ts: 'typescript',
};
