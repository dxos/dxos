//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { log } from '@dxos/log';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { CameraToolbar, NavigationToolbar, type ToolbarActions } from './Toolbar.tsx';

/** The bar over a fake view: every action appends to a log so each button is seen to fire. */
const DefaultStory = () => {
  const [zoom, setZoom] = useState(1);
  const actions: ToolbarActions = {
    path: ['scene:root', 'scene:root/L'],
    nameOf: (id) => id.split(':')[1] ?? id,
    onPath: (index) => log(`path → ${index}`),
    fit: () => log('fit'),
    zoomReset: () => setZoom(1),
    zoomIn: () => setZoom((value) => value * 1.25),
    zoomOut: () => setZoom((value) => value / 1.25),
  };
  return (
    // `items-start`: each bar fills its box, as Canvas floats it, so the column must not stretch them.
    <div className='flex flex-col items-start gap-2 p-2'>
      <NavigationToolbar actions={actions} />
      <CameraToolbar actions={actions}>{Math.round(zoom * 100)}%</CameraToolbar>
    </div>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas-editor/components/Toolbar',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
};

export default meta;

export const Default: StoryObj = {};
