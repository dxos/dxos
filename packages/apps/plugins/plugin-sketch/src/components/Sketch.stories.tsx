//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type SerializedStore } from '@tldraw/store';
import { type TLRecord } from '@tldraw/tldraw';
import React, { useState } from 'react';

import { CanvasType, SketchType } from '@braneframe/types';
import { migrateCanvas } from '@braneframe/types/migrations';
import { createEchoObject } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import SketchComponent from './SketchComponent';
import { data } from './testing';

const createSketch = (content: SerializedStore<TLRecord> = {}) => {
  return createEchoObject(create(SketchType, { canvas: createEchoObject(create(CanvasType, { content })) }));
};

const Story = () => {
  const [sketch, setSketch] = useState<SketchType>(createSketch());

  const handleCreate = () => {
    console.log(JSON.stringify(data.v2, null, 2));
    setSketch(createSketch(data.v2));
  };

  const handleMigrate = async () => {
    const content = await migrateCanvas(data.v1);
    setSketch(createSketch(content));
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='p-2'>
        <Button variant='primary' onClick={handleCreate}>
          Generate
        </Button>
        <Button variant='ghost' onClick={handleMigrate}>
          Load V1 Sample
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
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
