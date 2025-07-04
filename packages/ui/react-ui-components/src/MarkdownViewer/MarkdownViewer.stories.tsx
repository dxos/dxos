//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownViewer } from './MarkdownViewer';

faker.seed(0);

const meta: Meta<typeof MarkdownViewer> = {
  title: 'ui/react-ui-components/MarkdownViewer',
  component: MarkdownViewer,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
};

export default meta;

type Story = StoryObj<typeof MarkdownViewer>;

const content = `
# Hello, world!

${faker.lorem.paragraphs(1)}

Here's a JSON block:

~~~json
{
  "hello": "world"
}
~~~

And some code:

~~~ts
const App = () => {
  const title = 'Hello, world!';
  return <div>{title}</div>;
};
~~~

${faker.lorem.paragraphs(1)}
`;

export const Default: Story = {
  args: {
    classNames: 'w-[30rem] border border-border rounded-md p-4',
    content,
  },
};
