//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { Image } from './Image';

const seed = Math.random();

faker.seed(seed);

const meta = {
  title: 'ui/react-ui-mosaic/Image',
  component: Image,
  render: (args) => (
    <div className='absolute inset-0 flex justify-center items-center'>
      <Image {...args} />
    </div>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: faker.image.url(),
  },
};

const classNames = 'bs-[12rem] is-[18rem]';

/**
 * Access to image at 'https://dxos.network/dxos-logotype-blue.png'
 * from origin 'http://localhost:9009' has been blocked by CORS policy:
 * No 'Access-Control-Allow-Origin' header is present on the requested resource.
 */
export const Cors: Story = {
  args: {
    src: 'https://dxos.network/dxos-logotype-blue.png',
    classNames,
  },
};

export const Corners: Story = {
  args: {
    src: 'https://picsum.photos/seed/picsum/200/200',
    classNames,
  },
};

export const SVG: Story = {
  args: {
    src: 'https://dxos.network/bg-kube.svg',
    classNames,
  },
};

export const Many: Story = {
  args: {
    src: 'https://dxos.network/bg-kube.svg',
  },
  render: () => {
    const images = useMemo(
      () => Array.from({ length: 9 }, (_, i) => `https://picsum.photos/seed/${seed + i}/500/500`),
      [],
    );
    return (
      <div className='is-[60rem] grid grid-cols-3 grid-rows-3 gap-8'>
        {images.map((src, i) => (
          <Image key={i} src={src} classNames={classNames} />
        ))}
      </div>
    );
  },
};
