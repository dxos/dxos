//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type Decorator, type StoryFn } from '@storybook/react';
import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Container } from './Container';
import { Slide } from './Slide';
import { createSlide } from '../../testing';

// TODO(burdon): Remove.
const FullscreenDecorator = (className?: string): Decorator => {
  return (Story: StoryFn) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

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
  decorators: [withTheme, FullscreenDecorator()],
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
