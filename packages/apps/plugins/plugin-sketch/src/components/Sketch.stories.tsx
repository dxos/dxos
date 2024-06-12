//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { SketchType } from '@braneframe/types';
import { create, Expando } from '@dxos/echo-schema';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';

import SketchComponent from './Sketch';

const createSketch = () => create(SketchType, { data: create(Expando, {}) });

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
