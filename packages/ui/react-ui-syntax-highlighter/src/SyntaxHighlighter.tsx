//
// Copyright 2024 DXOS.org
//

import React from 'react';
import type { SyntaxHighlighterProps as NativeSyntaxHighlighterProps } from 'react-syntax-highlighter';
// Lightweight version will load specific language parsers asynchronously.
// Using `light-async` version directly from dist to avoid any chance of the heavy one being loaded.
// eslint-disable-next-line no-restricted-imports
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light-async';
// eslint-disable-next-line no-restricted-imports
import styleDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
// eslint-disable-next-line no-restricted-imports
import styleLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const zeroWidthSpace = '\u200b';

export type SyntaxHighlighterProps = ThemedClassName<
  NativeSyntaxHighlighterProps & {
    fallback?: string;
  }
>;

/**
 * https://github.com/react-syntax-highlighter/react-syntax-highlighter
 */
export const SyntaxHighlighter = ({
  classNames,
  fallback = zeroWidthSpace,
  children,
  ...props
}: SyntaxHighlighterProps) => {
  const { themeMode } = useThemeContext();
  return (
    <div role='none' className={mx(classNames)}>
      <NativeSyntaxHighlighter {...props} style={themeMode === 'dark' ? styleDark : styleLight}>
        {/* Non-empty fallback prevents collapse. */}
        {children || fallback}
      </NativeSyntaxHighlighter>
    </div>
  );
};
