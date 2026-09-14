//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { FramePreview } from './FramePreview.tsx';

const meta = {
  title: 'plugins/plugin-studio/components/FramePreview',
  component: FramePreview,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
  args: {
    classNames: 'w-64',
  },
} satisfies Meta<typeof FramePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    index: 0,
    name: 'Establishing shot',
    src: 'https://picsum.photos/seed/frame/640/360',
    contentType: 'image/jpeg',
  },
};

/** Nothing produced yet: the placeholder names the frame by position. */
export const Placeholder: Story = {
  args: {
    index: 2,
    name: 'The reveal',
  },
};
