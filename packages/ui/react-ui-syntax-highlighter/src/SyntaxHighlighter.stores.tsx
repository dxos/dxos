//
// Copyright 2024 DXOS.org
//

import { withTheme } from '@dxos/storybook-utils';

import { SyntaxHighlighter } from './SyntaxHighlighter';

export default {
  title: 'react-ui-syntax-highlighter/SyntaxHighlighter',
  component: SyntaxHighlighter,
  decorators: [withTheme],
};

export const Default = {
  args: {
    children: JSON.stringify({}),
  },
};
