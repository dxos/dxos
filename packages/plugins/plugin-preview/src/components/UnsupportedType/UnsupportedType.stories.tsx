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

export const Default: Story = {
  args: {
    typename: 'org.dxos.type.board',
  },
};
