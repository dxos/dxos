//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { createObject } from '@dxos/echo-db';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { PromptEditor } from './PromptEditor';

type DefaultStoryProps = { content?: string };

const DefaultStory = ({ content }: DefaultStoryProps) => {
  const text = useMemo(() => createObject(Text.make({ content: content ?? '' })), [content]);
  return <PromptEditor id='story' text={text} />;
};

const meta = {
  title: 'plugins/plugin-generator/components/PromptEditor',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const Seeded: Story = { args: { content: '# A short film about\n\nAn astronaut on a desert planet.' } };
