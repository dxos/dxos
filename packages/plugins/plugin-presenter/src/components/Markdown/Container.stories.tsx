//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Container } from './Container';
import { Slide, type SlideProps } from './Slide';
import { createSlide } from '../../testing';

const DefaultStory = ({ content = '' }: SlideProps) => {
  return (
    <Container classNames='bg-neutral-200'>
      <Slide content={content} />
    </Container>
  );
};

export const Default = {
  args: {
    content: createSlide({ number: 1 }),
  },
};

export const Code = {
  args: {
    content: createSlide({ code: true }),
  },
};

export const List = {
  args: {
    content: createSlide({ list: 3 }),
  },
};

export const Ordered = {
  args: {
    content: createSlide({ ordered: 4 }),
  },
};

const meta: Meta<typeof Slide> = {
  title: 'plugins/plugin-presenter/Container',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
