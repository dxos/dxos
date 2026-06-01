//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Generation, GeneratorCapabilities, Settings } from '#types';

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
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contributes(GeneratorCapabilities.Settings, Atom.make<Settings.Settings>({ apiKey: undefined }))],
    }),
  ],
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
export const WithAudio: Story = {
  args: {
    type: 'audio',
    prompt: 'A 30-second jazz piano piece in the key of D minor.',
    urls: [
      'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
    ],
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
