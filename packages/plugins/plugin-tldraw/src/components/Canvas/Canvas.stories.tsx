//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { Next } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { RecordBuilder } from '#model';
import { data } from '#testing';
import { Tldraw } from '#types';

import { migrateCanvas } from '../../migrations/index.ts';
import { CanvasComponent } from './Canvas.tsx';

const DefaultStory = () => {
  const [canvas, setCanvas] = useState(
    createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content: data.v2 })),
  );

  const handleClear = () => {
    setCanvas(createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA })));
  };

  const handleCreate = () => {
    const canvas = createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content: data.v2 }));
    console.log(JSON.stringify(canvas, undefined, 2));
    setCanvas(canvas);
  };

  const handleMigrate = async () => {
    const content = await migrateCanvas(data.v1);
    setCanvas(createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content })));
  };

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button variant='primary' onClick={handleClear}>
            Clear
          </Next.Button>
          <Next.Button variant='ghost' onClick={handleCreate}>
            Create
          </Next.Button>
          <Next.Button variant='ghost' onClick={handleMigrate}>
            Load V1 Sample
          </Next.Button>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <CanvasComponent classNames='dx-attention-surface' canvas={canvas} assetsBaseUrl={null} autoCenter />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-tldraw/components/Canvas',
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
  const [canvas] = useState(() =>
    createObject(
      Drawing.makeCanvas({
        schema: Tldraw.TLDRAW_SCHEMA,
        content: new RecordBuilder()
          .rectangle({ id: 'a', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid' })
          .ellipse({ id: 'b', x: 360, y: 0, text: 'ECHO', color: 'green' })
          .geo('star', { id: 'c', x: 180, y: 280, text: 'EDGE', color: 'yellow' })
          .text({ x: 0, y: 480, text: 'Built with TldrawBuilder', font: 'mono' })
          .arrow({ from: 'a', to: 'b', text: 'syncs' })
          .arrow({ from: 'b', to: 'c' })
          .build(),
      }),
    ),
  );

  return (
    <Next.Panel.Root>
      <Next.Panel.Body asChild>
        <CanvasComponent classNames='dx-attention-surface' canvas={canvas} assetsBaseUrl={null} autoCenter />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

export const Builder: Story = {
  render: BuilderStory,
};
