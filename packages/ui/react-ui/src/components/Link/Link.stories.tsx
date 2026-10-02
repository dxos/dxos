//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '../../testing/index.ts';
import * as Link from './Link.tsx';

const meta = {
  title: 'ui/react-ui-core/components/Link',
  component: Link.Root,
  decorators: [withTheme()],
} satisfies Meta<typeof Link.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Hello', href: '#' } };
