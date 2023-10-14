//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { type FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Container } from './Container';
import { Slide } from './Slide';
import { createSlide } from '../../testing';

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const Story: FC<{ content: string }> = ({ content }) => {
  return (
    <Container>
      <Slide content={content} />
    </Container>
  );
};

export default {
  component: Story,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    content: createSlide(),
  },
};
