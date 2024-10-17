//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { withTheme } from '@dxos/storybook-utils';

import { SyntaxHighlighter } from './SyntaxHighlighter';

export default {
  title: 'react-ui-syntax-highlighter/SyntaxHighlighter',
  component: SyntaxHighlighter,
  decorators: [withTheme],
};

export const Default = {
  args: {
    language: 'json',
    className: 'text-sm',
    children: JSON.stringify({ message: 'DXOS', initialized: true }, null, 2),
  },
};

export const Typescript = {
  args: {
    language: 'ts',
    children: 'const x = 100;',
  },
};

export const Empty = {
  args: {
    children: false,
  },
};
