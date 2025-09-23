//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Image } from './Image';

faker.seed(1);

const meta = {
  title: 'ui/react-ui-stack/Image',
  component: Image,
  render: (args) => (
    <div className='absolute inset-0 flex place-items-center'>
      <Image {...args} />
    </div>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: faker.image.url(),
  },
};

export const SVG: Story = {
  args: {
    src: 'https://dxos.network/bg-kube.svg',
    classNames: 'w-[20rem]',
  },
};
