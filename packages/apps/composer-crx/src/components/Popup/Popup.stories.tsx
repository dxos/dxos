//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { Popup } from './Popup';

const meta = {
  title: 'apps/composer-crx/Popup',
  component: Popup,
  decorators: [withTheme],
} satisfies Meta<typeof Popup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
