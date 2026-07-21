//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Thumbnail } from './Thumbnail';

const meta = {
  title: 'apps/composer-crx/Thumbnail',
  component: Thumbnail,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[24rem]' })],
  parameters: { translations },
} satisfies Meta<typeof Thumbnail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    url: 'https://placehold.co/320x200',
  },
};
