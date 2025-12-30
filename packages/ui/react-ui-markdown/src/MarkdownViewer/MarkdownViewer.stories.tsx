//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { MarkdownViewer } from './MarkdownViewer';

faker.seed(0);

const meta = {
  title: 'ui/react-ui-markdown/MarkdownViewer',
  component: MarkdownViewer,
  decorators: [withTheme, withLayout({ layout: 'column' })],
} satisfies Meta<typeof MarkdownViewer>;

export default meta;

type Story = StoryObj<typeof MarkdownViewer>;

const content = trim`
  # Hello World!

  > An example of the MarkdownViewer component.

  ${faker.lorem.paragraphs(1)}

  Here's a JSON block:

  ~~~json
  {
    "hello": "world"
  }
  ~~~

  And some code:

  ~~~tsx
  import React from 'react'

  const App = () => {
    const title = 'Hello, world!'
    return <div>{title}</div>
  }
  ~~~

  ## Task lists

  - [ ] Task one
  - [x] Task two
  - [ ] Task three

  ## Tables

  | Column 1 | Column 2 | Column 3 |
  | -------- | -------- | -------- |
  | Cell 1   | Cell 2   | Cell 3   |
  | Cell 4   | Cell 5   | Cell 6   |
  | Cell 7   | Cell 8   | Cell 9   |

  ## Examples

  ${faker.lorem.paragraphs(1)}
`;

export const Default: Story = {
  args: {
    classNames: 'p-4 border border-border rounded-md overflow-y-auto bg-baseSurface',
    content,
  },
};
