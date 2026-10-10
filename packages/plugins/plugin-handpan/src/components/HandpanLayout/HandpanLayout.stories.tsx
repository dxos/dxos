//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SCALES, getScaleNotes } from '#audio';
import { translations } from '#translations';

import { HandpanLayout } from './HandpanLayout.tsx';

const notes = getScaleNotes(SCALES[0]);

const meta = {
  title: 'plugins/plugin-handpan/components/HandpanLayout',
  component: HandpanLayout,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof HandpanLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { notes },
};

export const Calibrating: Story = {
  args: {
    notes,
    target: 'Bb3',
    active: 'A3',
    progress: { D3: 1, A3: 1, Bb3: 1 / 3 },
  },
};
