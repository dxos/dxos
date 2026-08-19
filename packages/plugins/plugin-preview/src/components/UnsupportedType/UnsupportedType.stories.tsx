//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { UnsupportedType } from './UnsupportedType';

const meta = {
  title: 'plugins/plugin-preview/UnsupportedType',
  component: UnsupportedType,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof UnsupportedType>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A curated build: the object's plugin is absent here, but a full-catalog build can open it. */
export const Default: Story = {
  args: {
    typename: 'dxos.org/type/Board',
    href: 'https://nightly.composer.space/',
  },
};

/** A full-catalog build: nowhere else to send the user, so no link. */
export const NoAlternative: Story = {
  args: {
    typename: 'dxos.org/type/Board',
  },
};
