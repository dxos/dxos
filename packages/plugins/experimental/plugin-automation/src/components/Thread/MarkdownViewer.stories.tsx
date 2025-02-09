//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownViewer } from './MarkdownViewer';

const meta: Meta<typeof MarkdownViewer> = {
  title: 'plugins/plugin-automation/MarkdownViewer',
  component: MarkdownViewer,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
};

export default meta;

type Story = StoryObj<typeof MarkdownViewer>;

const content = `
# Hello, world!

This is a test of the markdown viewer.

Here's a JSON block:

~~~json
{
  "hello": "world"
}
~~~

And some code:

~~~ts
const App = () => {
  return <div>Hello, world!</div>;
};
~~~

And some final text.
`;

export const Default: Story = {
  args: {
    classNames: 'w-[500px] border border-border rounded-md p-4',
    content,
  },
};
