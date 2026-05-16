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
  url?: string;
  type?: Generation.Kind;
};

const DefaultStory = ({ prompt, url, type }: DefaultStoryProps) => {
  const subject = useMemo(() => {
    const generation = Generation.make({ name: 'Story generation', type, prompt });
    if (url) {
      Obj.update(generation, (generation) => {
        generation.url = url;
      });
    }
    return generation;
  }, [prompt, url, type]);
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
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
};
export const WithAudio: Story = {
  args: {
    type: 'audio',
    prompt: 'A 30-second jazz piano piece in the key of D minor.',
    url: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
  },
};
