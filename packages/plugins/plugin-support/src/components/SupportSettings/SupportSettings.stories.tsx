//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SupportSettings } from './SupportSettings';

const meta = {
  title: 'plugins/plugin-support/components/SupportSettings',
  component: SupportSettings,
  decorators: [withClientProvider({ createIdentity: true }), withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof SupportSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {},
  },
};
