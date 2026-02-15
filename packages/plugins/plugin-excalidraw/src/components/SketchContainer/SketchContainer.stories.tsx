//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-db';
import { Diagram } from '@dxos/plugin-sketch/types';
import { withTheme } from '@dxos/react-ui/testing';

import { EXCALIDRAW_SCHEMA } from '../../types';

import { SketchContainer } from './SketchContainer';

const DefaultStory = () => {
  const [sketch] = useState(createObject(Diagram.make({ canvas: { schema: EXCALIDRAW_SCHEMA } })));

  return <SketchContainer role='article' subject={sketch} settings={{}} />;
};

const meta = {
  title: 'plugins/plugin-excalidraw/SketchComponent',
  component: SketchContainer as any,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
