//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { PresenterSettings } from './PresenterSettings';

const meta = {
  title: 'plugins/plugin-presenter/containers/PresenterSettings',
  component: PresenterSettings,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof PresenterSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: { presentCollections: true },
  },
};
