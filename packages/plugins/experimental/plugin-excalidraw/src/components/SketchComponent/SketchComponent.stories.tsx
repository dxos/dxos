//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { createEchoObject } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { SketchComponent } from './SketchComponent';

const createSketch = () => {
  return createEchoObject(create(DiagramType, { canvas: createEchoObject(create(CanvasType, { content: {} })) }));
};

const Story = () => {
  const [sketch] = useState<DiagramType>(createSketch());

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex grow overflow-hidden'>
        <SketchComponent sketch={sketch} />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-excalidraw/SketchComponent',
  component: SketchComponent,
  render: Story,
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
