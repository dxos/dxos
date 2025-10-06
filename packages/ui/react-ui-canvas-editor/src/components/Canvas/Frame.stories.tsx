//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Canvas } from '@dxos/react-ui-canvas';
import { withTheme } from '@dxos/react-ui/testing';

import { createRectangle } from '../../shapes';
import { Editor } from '../Editor';

import { Shapes, type ShapesProps } from './Shapes';

const DefaultStory = ({ layout }: ShapesProps) => {
  return (
    <Editor.Root id='test'>
      <Canvas>
        <Shapes layout={layout} />
      </Canvas>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/Frame',
  component: Canvas,
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
    layout: {
      shapes: [
        createRectangle({
          id: 'item-1',
          center: { x: 0, y: 0 },
          size: { width: 256, height: 128 },
        }),
      ],
    },
  },
};
