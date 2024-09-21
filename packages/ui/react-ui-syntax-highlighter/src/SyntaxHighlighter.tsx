//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { Prism } from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import styleDark from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-dark';
// eslint-disable-next-line no-restricted-imports
import styleLight from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { useThemeContext } from '@dxos/react-ui';

export type SyntaxHighlighterProps = {
  children: string | string[];
  language: string;
};

export const SyntaxHighlighter = ({ children, ...props }: SyntaxHighlighterProps) => {
  const { themeMode } = useThemeContext();
  return (
    <Prism {...props} style={themeMode === 'dark' ? styleDark : styleLight}>
      {children}
    </Prism>
  );
};
