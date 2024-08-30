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

const createSketch = (content: SerializedStore<TLRecord> = {}) => {
  return createEchoObject(
    create(DiagramType, {
      canvas: createEchoObject(
        create(CanvasType, {
          schema: TLDRAW_SCHEMA,
          content,
        }),
      ),
    }),
  );
};

// TODO(burdon): Data is corrupted.
// TODO(burdon): Storybook bottom panel (Controls, Actions seem to interfere with layout). All stories.
const Story = () => {
  const [sketch, setSketch] = useState<DiagramType>(createSketch());

  const handleCreate = () => {
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
          Create
        </Button>
        <Button variant='ghost' onClick={handleMigrate}>
          Load V1 Sample
        </Button>
      </Toolbar.Root>
      <div className='flex grow overflow-hidden'>
        {/* TODO(burdon): Configure local storybook assets? */}
        <Sketch sketch={sketch} assetsBaseUrl={null} />
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
