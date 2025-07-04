//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Canvas } from '@dxos/react-ui-canvas';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Shapes, type ShapesProps } from './Shapes';
import { createRectangle } from '../../shapes';
import { Editor } from '../Editor';

const DefaultStory = ({ layout }: ShapesProps) => {
  return (
    <Editor.Root id='test'>
      <Canvas>
        <Shapes layout={layout} />
      </Canvas>
    </Editor.Root>
  );
};

const meta: Meta<ShapesProps> = {
  title: 'ui/react-ui-canvas-editor/Frame',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<ShapesProps>;

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
