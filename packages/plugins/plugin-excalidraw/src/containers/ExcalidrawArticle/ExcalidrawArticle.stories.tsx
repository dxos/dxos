//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Excalidraw } from '#types';

import { ExcalidrawArticle } from './ExcalidrawArticle';

const DefaultStory = () => {
  const [sketch] = useState(createObject(Excalidraw.make({ canvas: { schema: Excalidraw.EXCALIDRAW_SCHEMA } })));

  return <ExcalidrawArticle role='article' subject={sketch} attendableId='story' settings={{}} />;
};

const meta = {
  title: 'plugins/plugin-excalidraw/containers/ExcalidrawArticle',
  component: ExcalidrawArticle as any,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
