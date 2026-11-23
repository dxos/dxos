//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Player } from './Player.tsx';
import { sampleManifest } from './testing/sample.ts';

const meta = {
  title: 'tools/autocue/Player',
  component: Player,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof Player>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { manifest: sampleManifest },
};

export const SpecView: Story = {
  args: { manifest: sampleManifest, initialView: 'spec' },
};
