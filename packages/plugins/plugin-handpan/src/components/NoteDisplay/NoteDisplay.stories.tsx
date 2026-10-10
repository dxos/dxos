//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { NoteDisplay } from './NoteDisplay.tsx';

const meta = {
  title: 'plugins/plugin-handpan/components/NoteDisplay',
  component: NoteDisplay,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof NoteDisplay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: '3', pitch: 'C4', frequency: 262.4, cents: 5, clarity: 0.97 },
};

export const OutOfTune: Story = {
  args: { label: '5', pitch: 'E4', frequency: 336.1, cents: 34, clarity: 0.92 },
};

export const Percussive: Story = {
  args: { percussive: true },
};

export const Empty: Story = {
  args: {},
};
