//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { CanvasType, SketchType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { createEchoObject } from '@dxos/react-client/echo';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';

import SketchComponent from './Sketch';

const createSketch = () =>
  createEchoObject(create(SketchType, { canvas: createEchoObject(create(CanvasType, { content: {} })) }));

const Story = () => {
  const [sketch, setSketch] = useState<SketchType>(createSketch());

  return (
    <div className='flex flex-col grow overflow-hidden divide-y'>
      <Toolbar.Root>
        <Button variant='ghost' onClick={() => setSketch(createSketch())}>
          Change
        </Button>
      </Toolbar.Root>
      <div className='flex grow overflow-hidden'>
        <SketchComponent sketch={sketch} />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-sketch/SketchComponent',
  component: SketchComponent,
  render: Story,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
