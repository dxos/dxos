//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StoryboardPlayer } from './StoryboardPlayer.tsx';

const ATTENDABLE_ID = 'test';

const meta = {
  title: 'plugins/plugin-studio/components/StoryboardPlayer',
  component: StoryboardPlayer,
  // The toolbar is live only while its plank has attention, so the story attends it up front.
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withAttention(ATTENDABLE_ID)],
  parameters: { layout: 'fullscreen', translations },
  args: { attendableId: ATTENDABLE_ID },
} satisfies Meta<typeof StoryboardPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. The first clip autoplays; when it ends the second starts without a click.
 * 2. The still (third) shows for a few seconds, then the counter stops at 4 / 4.
 * 3. Skip back/forward move between clips; the counter and caption follow.
 */
export const Default: Story = {
  args: {
    clips: [
      {
        id: '1',
        name: 'Flower',
        src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        contentType: 'video/mp4',
      },
      {
        id: '2',
        name: 'Flower again',
        src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        contentType: 'video/mp4',
      },
      { id: '3', name: 'A still', src: 'https://picsum.photos/seed/sb-still/768/432', contentType: 'image/jpeg' },
      {
        id: '4',
        name: 'Last',
        src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        contentType: 'video/mp4',
      },
    ],
    stillMs: 2_000,
  },
};
