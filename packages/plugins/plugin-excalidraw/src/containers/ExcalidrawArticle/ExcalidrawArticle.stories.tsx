//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import { Sketch } from '@dxos/plugin-illustrator/types';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Excalidraw } from '#types';

import { ExcalidrawArticle } from './ExcalidrawArticle';

const DefaultStory = () => {
  const [{ sketch, canvas }] = useState(() => {
    const canvas = createObject(Excalidraw.makeCanvas());
    return { sketch: createObject(Sketch.make({ canvas })), canvas };
  });

  return <ExcalidrawArticle role='article' sketch={sketch} canvas={canvas} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-excalidraw/containers/ExcalidrawArticle',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
