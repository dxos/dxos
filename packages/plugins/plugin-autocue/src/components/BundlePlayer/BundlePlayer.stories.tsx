//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { FIXTURE_BUNDLE_URL } from '../../testing/index.ts';
import { BundlePlayer } from './BundlePlayer.tsx';

const meta = {
  title: 'plugins/plugin-autocue/components/BundlePlayer',
  component: BundlePlayer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations },
} satisfies Meta<typeof BundlePlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Set `url` to any hosted bundle (e.g. `https://dx.pub/demo/<slug>/`) to play it instead. */
export const Default: Story = {
  args: { url: FIXTURE_BUNDLE_URL },
};

export const NoUrl: Story = {
  args: {},
};

export const Missing: Story = {
  args: { url: 'https://dx.pub/demo/does-not-exist/' },
};
