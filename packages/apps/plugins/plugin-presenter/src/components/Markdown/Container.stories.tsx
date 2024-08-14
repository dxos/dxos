//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC } from 'react';

import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Container } from './Container';
import { Slide } from './Slide';
import { createSlide } from '../../testing';

const Story: FC<{ content: string }> = ({ content }) => {
  return (
    <Container classNames='bg-neutral-200'>
      <Slide content={content} />
    </Container>
  );
};

export default {
  title: 'plugin-presenter/Container',
  render: Story,
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
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
