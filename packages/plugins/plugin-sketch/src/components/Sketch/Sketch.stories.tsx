//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type SerializedStore } from '@tldraw/store';
import { type TLRecord } from '@tldraw/tldraw';
import React, { useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { createObject } from '@dxos/echo-db';
import { Button, Toolbar } from '@dxos/react-ui';

import { migrateCanvas } from '../../migrations';
import { data } from '../../testing';
import { CanvasType, DiagramType, TLDRAW_SCHEMA } from '../../types';

import { Sketch } from './Sketch';

const createSketch = (content: SerializedStore<TLRecord> = {}): DiagramType => {
  return Obj.make(DiagramType, {
    canvas: Ref.make(Obj.make(CanvasType, { schema: TLDRAW_SCHEMA, content })),
  });
};

const DefaultStory = () => {
  const [sketch, setSketch] = useState<DiagramType>(createObject(createSketch(data.v2)));

  const handleClear = () => {
    const sketch = createSketch();
    setSketch(sketch);
  };

  const handleCreate = () => {
    const sketch = createSketch(data.v2);
    console.log(JSON.stringify(sketch, undefined, 2));
    setSketch(sketch);
  };

  const handleMigrate = async () => {
    const content = await migrateCanvas(data.v1);
    setSketch(createSketch(content));
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='p-1'>
        <Button variant='primary' onClick={handleClear}>
          Clear
        </Button>
        <Button variant='ghost' onClick={handleCreate}>
          Create
        </Button>
        <Button variant='ghost' onClick={handleMigrate}>
          Load V1 Sample
        </Button>
      </Toolbar.Root>
      <div className='flex grow overflow-hidden'>
        <Sketch sketch={sketch} assetsBaseUrl={null} autoZoom />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-sketch/Sketch',
  component: Sketch as any,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
