//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SketchComponent } from './SketchComponent';

const createSketch = () => {
  return createObject(create(DiagramType, { canvas: createObject(create(CanvasType, { content: {} })) }));
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

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-excalidraw/SketchComponent',
  component: SketchComponent,
  render: Story,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
