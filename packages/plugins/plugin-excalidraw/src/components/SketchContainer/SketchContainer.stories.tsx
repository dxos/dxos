//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SketchContainer } from './SketchContainer';

const createSketch = () => {
  return Obj.make(DiagramType, {
    canvas: Ref.make(Obj.make(CanvasType, { content: {} })),
  });
};

const DefaultStory = () => {
  const [sketch] = useState<DiagramType>(createSketch());

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex grow overflow-hidden'>
        <SketchContainer sketch={sketch} role='article' settings={{}} />
      </div>
    </div>
  );
};

export const Default: Story = {};

const meta = {
  title: 'plugins/plugin-excalidraw/SketchComponent',
  component: SketchContainer,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SketchContainer>;

export default meta;

type Story = StoryObj<typeof meta>;
