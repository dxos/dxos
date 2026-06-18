//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Generation } from '#types';

import { GenerationArticle } from './GenerationArticle';

type DefaultStoryProps = {
  prompt?: string;
  urls?: string[];
  type?: Generation.Kind;
};

const DefaultStory = ({ prompt, urls, type }: DefaultStoryProps) => {
  const subject = useMemo(() => {
    const generation = Generation.make({ name: 'Story generation', type, prompt });
    if (urls?.length) {
      Obj.update(generation, (generation) => {
        generation.urls = urls;
      });
    }
    return generation;
  }, [prompt, urls, type]);
  return <GenerationArticle role='article' subject={subject} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-generator/containers/GenerationArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { type: 'video' } };
export const WithVideo: Story = {
  args: {
    type: 'video',
    prompt: 'A short scene of waves crashing against a rocky shore at sunset.',
    urls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'],
  },
};
export const MultipleUrls: Story = {
  args: {
    type: 'video',
    prompt: 'Multiple takes of the same prompt.',
    urls: [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    ],
  },
};
