//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type EmptyProps, Empty } from './Empty';

const meta = {
  title: 'ui/react-ui-list/Empty',
  component: Empty,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof Empty>;

export default meta;

type Story = StoryObj<EmptyProps>;

/** No label — falls back to the generic message. */
export const Fallback: Story = {};

/** Caller-supplied (already-translated) label. */
export const WithLabel: Story = {
  args: {
    label: 'No automations',
  },
};

/** Label plus a leading icon. */
export const WithIcon: Story = {
  args: {
    label: 'No automations',
    icon: 'ph--lightning--regular',
  },
};
