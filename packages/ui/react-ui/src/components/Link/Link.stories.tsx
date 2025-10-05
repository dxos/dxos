//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { Link } from './Link';

const meta = {
  title: 'ui/react-ui-core/Link',
  component: Link,
  decorators: [withTheme],
  parameters: {
    chromatic: { disableSnapshot: false },
  },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Hello', href: '#' } };
