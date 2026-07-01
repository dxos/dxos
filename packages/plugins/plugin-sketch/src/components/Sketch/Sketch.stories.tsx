//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SketchBuilder, data } from '#testing';
import { Sketch } from '#types';

import { migrateCanvas } from '../../migrations';
import { SketchComponent } from './Sketch';

const DefaultStory = () => {
  const [sketch, setSketch] = useState(createObject(Sketch.make({ canvas: { content: data.v2 } })));

  const handleClear = () => {
    const sketch = createObject(Sketch.make());
    setSketch(sketch);
  };

  const handleCreate = () => {
    const sketch = createObject(Sketch.make({ canvas: { content: data.v2 } }));
    console.log(JSON.stringify(sketch, undefined, 2));
    setSketch(sketch);
  };

  const handleMigrate = async () => {
    const content = await migrateCanvas(data.v1);
    setSketch(createObject(Sketch.make({ canvas: { content } })));
  };

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
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
      </Panel.Toolbar>
      <Panel.Content asChild>
        <SketchComponent classNames='dx-attention-surface' sketch={sketch} assetsBaseUrl={null} autoZoom />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-sketch/components/Sketch',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const BuilderStory = () => {
  const [sketch] = useState(() =>
    createObject(
      Sketch.make({
        canvas: {
          content: new SketchBuilder()
            .rectangle({ id: 'a', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid' })
            .ellipse({ id: 'b', x: 360, y: 0, text: 'ECHO', color: 'green' })
            .geo('star', { id: 'c', x: 180, y: 280, text: 'EDGE', color: 'yellow' })
            .text({ x: 0, y: 480, text: 'Built with SketchBuilder', font: 'mono' })
            .arrow({ from: 'a', to: 'b', text: 'syncs' })
            .arrow({ from: 'b', to: 'c' })
            .build(),
        },
      }),
    ),
  );

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <SketchComponent classNames='dx-attention-surface' sketch={sketch} assetsBaseUrl={null} autoZoom />
      </Panel.Content>
    </Panel.Root>
  );
};

export const Builder: Story = {
  render: BuilderStory,
};
