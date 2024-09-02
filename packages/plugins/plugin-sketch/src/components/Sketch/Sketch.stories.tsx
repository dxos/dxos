//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type SerializedStore } from '@tldraw/store';
import { type TLRecord } from '@tldraw/tldraw';
import React, { useState } from 'react';

import { createEchoObject } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { Button, Toolbar } from '@dxos/react-ui';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Sketch } from './Sketch';
import { migrateCanvas } from '../../migrations';
import { data } from '../../testing';
import { CanvasType, DiagramType, TLDRAW_SCHEMA } from '../../types';

const createSketch = (content: SerializedStore<TLRecord> = {}): DiagramType => {
  return createEchoObject(
    create(DiagramType, {
      canvas: createEchoObject(create(CanvasType, { schema: TLDRAW_SCHEMA, content })),
    }),
  );
};

const Story = () => {
  const [sketch, setSketch] = useState<DiagramType>(createSketch(data.v2));

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

  const handleSnap = async () => {
    const snap = (value: number, tolerance = 40) => {
      return Math.round(value / tolerance) * tolerance;
    };

    // TODO(burdon): Throws error.
    //  Uncaught (in promise) Error: Schema not found in schema registry: dxos.org/type/Canvas
    Object.entries(sketch.canvas?.content ?? {}).forEach(([id, item]) => {
      const { x, y, props: { w, h } = {} } = item as { x: number; y: number; props: { w?: number; h?: number } };
      // console.log(id, JSON.stringify({ x, y, w, h }, undefined, 2));
      if (x !== undefined && y !== undefined) {
        item.x = snap(x);
        item.y = snap(y);
        // TODO(burdon): Maintain aspect ratio?
        if (w !== undefined && h !== undefined) {
          item.props.w = snap(w);
          item.props.h = snap(h);
        }
      }
    });
  };

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='p-2'>
        <Button variant='primary' onClick={handleClear}>
          Clear
        </Button>
        <Button variant='ghost' onClick={handleCreate}>
          Create
        </Button>
        <Button variant='ghost' onClick={handleMigrate}>
          Load V1 Sample
        </Button>
        <Button variant='ghost' onClick={handleSnap}>
          Snap
        </Button>
      </Toolbar.Root>
      <div className='flex grow overflow-hidden'>
        <Sketch sketch={sketch} assetsBaseUrl={null} autoZoom />
      </div>
    </div>
  );
};

export default {
  title: 'plugin-sketch/SketchComponent',
  component: Sketch,
  render: Story,
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
