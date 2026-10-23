//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createSlide } from '#testing';

import { MarkdownSlide, type MarkdownSlideProps } from '../MarkdownSlide/index.ts';
import { SlideFrame } from './SlideFrame.tsx';

const DefaultStory = ({ content = '' }: MarkdownSlideProps) => {
  return (
    <SlideFrame classNames='bg-scrim-surface'>
      <MarkdownSlide content={content} />
    </SlideFrame>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/components/SlideFrame',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: createSlide({ number: 1 }),
  },
};

export const Code: Story = {
  args: {
    content: createSlide({ code: true }),
  },
};

export const List: Story = {
  args: {
    content: createSlide({ list: 3 }),
  },
};

export const Ordered: Story = {
  args: {
    content: createSlide({ ordered: 4 }),
  },
};
