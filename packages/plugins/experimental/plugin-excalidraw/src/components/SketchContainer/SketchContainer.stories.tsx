//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-db';
import { create } from '@dxos/live-object';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SketchContainer } from './SketchContainer';

const createSketch = () => {
  return createObject(create(DiagramType, { canvas: createObject(create(CanvasType, { content: {} })) }));
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

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-excalidraw/SketchComponent',
  component: SketchContainer,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
