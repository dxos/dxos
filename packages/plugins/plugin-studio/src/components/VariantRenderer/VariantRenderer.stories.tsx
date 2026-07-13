//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type VariantContent } from '#surfaces';

import { ImageVariant } from './ImageVariant';
import { VideoVariant } from './VideoVariant';

import { translations } from '../../translations';

const imageVariant: VariantContent = {
  contentType: 'image/png',
  url: 'https://picsum.photos/seed/studio-image/640/480',
  generation: { provider: 'mock', prompt: 'A serene mountain lake at dawn.' },
};

const videoVariant: VariantContent = {
  contentType: 'video/mp4',
  url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  generation: { provider: 'mock', prompt: 'A blooming flower time-lapse.' },
};

const meta: Meta = {
  title: 'plugins/plugin-studio/components/VariantRenderer',
  decorators: [withTheme(), withLayout()],
  parameters: { translations },
};

export default meta;

type Story = StoryObj;

export const Image: Story = {
  render: () => (
    <div className='is-96'>
      <ImageVariant variant={imageVariant} />
    </div>
  ),
};

export const Video: Story = {
  render: () => (
    <div className='is-96'>
      <VideoVariant variant={videoVariant} />
    </div>
  ),
};
