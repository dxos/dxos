//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { type SyntaxHighlighterProps as NativeSyntaxHighlighterProps } from 'react-syntax-highlighter';
// Using `light-async` version directly from dist to avoid any chance of the heavy one being loaded.
// Lightweight version will load specific language parsers asynchronously.
// eslint-disable-next-line no-restricted-imports
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light-async';
// eslint-disable-next-line no-restricted-imports
import { github as light, a11yDark as dark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const zeroWidthSpace = '\u200b';

export type SyntaxHighlighterProps = ThemedClassName<
  NativeSyntaxHighlighterProps & {
    fallback?: string;
  }
>;

light.hljs.background = '';
dark.hljs.background = '';

/**
 * https://github.com/react-syntax-highlighter/react-syntax-highlighter
 */
export const SyntaxHighlighter = ({
  classNames,
  children,
  fallback = zeroWidthSpace,
  ...props
}: SyntaxHighlighterProps) => {
  const { themeMode } = useThemeContext();

  return (
    <NativeSyntaxHighlighter
      className={mx('w-full p-0 bg-baseSurface font-thin overflow-auto scrollbar-thin', classNames)}
      style={themeMode === 'dark' ? dark : light}
      {...props}
    >
      {/* Non-empty fallback prevents collapse. */}
      {children || fallback}
    </NativeSyntaxHighlighter>
  );
};
