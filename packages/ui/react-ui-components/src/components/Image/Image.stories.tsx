//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ImageWithBackground } from './Image';

faker.seed(0);

const meta = {
  title: 'ui/react-ui-components/ImageWithBackground',
  component: ImageWithBackground,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'is-full bs-full' })],
} satisfies Meta<typeof ImageWithBackground>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: faker.image.url(),
    alt: 'test',
  },
};
