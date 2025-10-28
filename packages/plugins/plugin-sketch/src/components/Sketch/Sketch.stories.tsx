//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-db';
import { Button, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { migrateCanvas } from '../../migrations';
import { data } from '../../testing';
import { Diagram } from '../../types';

import { Sketch } from './Sketch';

const DefaultStory = () => {
  const [sketch, setSketch] = useState(createObject(Diagram.make({ canvas: { content: data.v2 } })));

  const handleClear = () => {
    const sketch = createObject(Diagram.make());
    setSketch(sketch);
  };

  const handleCreate = () => {
    const sketch = createObject(Diagram.make({ canvas: { content: data.v2 } }));
    console.log(JSON.stringify(sketch, undefined, 2));
    setSketch(sketch);
  };

  const handleMigrate = async () => {
    const content = await migrateCanvas(data.v1);
    setSketch(createObject(Diagram.make({ canvas: { content } })));
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root>
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
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
