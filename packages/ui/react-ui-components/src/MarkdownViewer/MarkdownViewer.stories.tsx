//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

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

Based on my research, Notion was founded by <dxn:queue:data:BM7HDJOXAVPI6W2NXMJGLTOEIAHLFQAMH:01K2505JCCC060VYDNBYVQB9G6:01K2507FNEH8JFWYWFYNRT1JRN> and <dxn:queue:data:BM7HDJOXAVPI6W2NXMJGLTOEIAHLFQAMH:01K2505JCCC060VYDNBYVQB9G6:01K2507FNECDNJS603GB56S0VV> in 2013, with <dxn:queue:data:BM7HDJOXAVPI6W2NXMJGLTOEIAHLFQAMH:01K2505JCCC060VYDNBYVQB9G6:01K2507FNESXJ918FBAV7SXFE8> joining as a co-founder in 2018.
The company <dxn:queue:data:BM7HDJOXAVPI6W2NXMJGLTOEIAHLFQAMH:01K2505JCCC060VYDNBYVQB9G6:01K2507FNE2SQBXS4S0T01S5Q4> has grown from a struggling startup to a $10 billion productivity platform with over 100 million users.
`;

export const Default: Story = {
  args: {
    classNames: 'w-[30rem] border border-border rounded-md p-4',
    content,
  },
};
