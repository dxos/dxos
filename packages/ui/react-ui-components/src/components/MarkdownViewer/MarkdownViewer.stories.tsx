//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { MarkdownViewer } from './MarkdownViewer';

faker.seed(0);

const meta = {
  title: 'ui/react-ui-components/MarkdownViewer',
  component: MarkdownViewer,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
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

  ## Examples

  ${faker.lorem.paragraphs(1)}
`;

export const Default: Story = {
  args: {
    classNames: 'w-[30rem] border border-border rounded-md p-4 overflow-x-hidden overflow-y-auto',
    content,
  },
};
