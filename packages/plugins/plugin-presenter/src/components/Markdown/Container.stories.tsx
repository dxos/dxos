//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { createSlide } from '../../testing';

import { Container } from './Container';
import { Slide, type SlideProps } from './Slide';

const DefaultStory = ({ content = '' }: SlideProps) => (
  <Container classNames='bg-neutral-200'>
    <Slide content={content} />
  </Container>
);

const meta = {
  title: 'plugins/plugin-presenter/Container',
  render: DefaultStory,
  decorators: [withTheme],
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
