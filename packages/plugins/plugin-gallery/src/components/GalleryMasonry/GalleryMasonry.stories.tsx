//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type Image } from '../../types/Gallery';
import { GalleryMasonry } from './GalleryMasonry';

// Picsum returns a random image at the requested size for each unique seed.
const mockImage = (seed: string, w: number, h: number, description?: string): Image => ({
  url: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  type: 'image/jpeg',
  name: `${seed}.jpg`,
  description,
  width: w,
  height: h,
});

const SAMPLE_IMAGES: Image[] = [
  mockImage('alpha', 600, 400, 'Mountain valley at dusk'),
  mockImage('bravo', 500, 700, 'Vertical forest path'),
  mockImage('charlie', 800, 500),
  mockImage('delta', 600, 600, 'A square crop'),
  mockImage('echo', 700, 480),
  mockImage('foxtrot', 500, 750, 'Tall city skyline'),
  mockImage('golf', 640, 360),
  mockImage('hotel', 540, 720),
  mockImage('india', 600, 450, 'Wide vista'),
  mockImage('juliet', 480, 640),
  mockImage('kilo', 700, 700, 'Square abstract'),
  mockImage('lima', 800, 450),
];

type DefaultStoryProps = {
  initialImages: Image[];
  enableDelete?: boolean;
};

const DefaultStory = ({ initialImages, enableDelete }: DefaultStoryProps) => {
  const [images, setImages] = useState<Image[]>(initialImages);

  return (
    <GalleryMasonry.Root
      role='article'
      images={images}
      onDelete={enableDelete ? (index) => setImages((prev) => prev.filter((_, i) => i !== index)) : undefined}
    >
      <GalleryMasonry.Toolbar>
        <Toolbar.Root>
          <Toolbar.Button>Add image</Toolbar.Button>
          <Toolbar.Button>Show</Toolbar.Button>
        </Toolbar.Root>
      </GalleryMasonry.Toolbar>
      <GalleryMasonry.Viewport />
    </GalleryMasonry.Root>
  );
};

const meta = {
  title: 'plugins/plugin-gallery/components/GalleryMasonry',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialImages: SAMPLE_IMAGES,
    enableDelete: true,
  },
};

export const Empty: Story = {
  args: {
    initialImages: [],
    enableDelete: true,
  },
};

export const ReadOnly: Story = {
  args: {
    initialImages: SAMPLE_IMAGES,
    enableDelete: false,
  },
};
