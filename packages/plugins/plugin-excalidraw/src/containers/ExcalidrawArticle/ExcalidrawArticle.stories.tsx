//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Excalidraw } from '#types';

import { ExcalidrawArticle } from './ExcalidrawArticle';

const DefaultStory = () => {
  const [{ drawing, canvas }] = useState(() => {
    const canvas = createObject(Drawing.makeCanvas({ schema: Excalidraw.EXCALIDRAW_SCHEMA }));
    return { drawing: createObject(Drawing.make({ canvas })), canvas };
  });

  return <ExcalidrawArticle role='article' drawing={drawing} canvas={canvas} attendableId='story' />;
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
