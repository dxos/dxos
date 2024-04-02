//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { SketchType } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';

import SketchComponent from './Sketch';

const Story = () => {
  const [sketch, setSketch] = useState<SketchType>(E.object(SketchType, { data: E.object(E.ExpandoType, {}) }));

  return (
    <div className='flex flex-col grow overflow-hidden divide-y'>
      <Toolbar.Root>
        <Button variant={'ghost'} onClick={() => setSketch(new SketchType())}>
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
