//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { freehandCapabilities } from '../../model/projection.ts';
import { defaultNodeRegistry } from '../../model/registry.ts';
import { type NodeType } from '../../model/types.ts';
import { ActionToolbar, CameraToolbar, NavigationToolbar, type ToolbarActions } from './Toolbar.tsx';

/** The bar over a fake view: every action appends to a log so each button is seen to fire. */
const DefaultStory = () => {
  const [log, setLog] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [guides, setGuides] = useState(true);
  const [debug, setDebug] = useState(false);
  const [zoom, setZoom] = useState(1);
  const note = (entry: string) => setLog((entries) => [entry, ...entries].slice(0, 12));
  const actions: ToolbarActions = {
    path: ['scene:root', 'scene:root/L'],
    nameOf: (id) => id.split(':')[1] ?? id,
    onPath: (index) => note(`path → ${index}`),
    fit: () => note('fit'),
    zoomReset: () => setZoom(1),
    zoomIn: () => setZoom((value) => value * 1.25),
    zoomOut: () => setZoom((value) => value / 1.25),
    snap,
    toggleSnap: () => setSnap((value) => !value),
    guides,
    toggleGuides: () => setGuides((value) => !value),
    debug,
    toggleDebug: () => setDebug((value) => !value),
    canUndo: true,
    canRedo: false,
    undo: () => note('undo'),
    redo: () => note('redo'),
    hasSelection: true,
    hasClipboard: true,
    cut: () => note('cut'),
    copy: () => note('copy'),
    paste: () => note('paste'),
    delete: () => note('delete'),
    create: (type: NodeType) => note(`create ${type}`),
  };
  return (
    // `items-start`: each bar fills its box, as SceneView floats it, so the column must not stretch them.
    <div className='flex flex-col items-start gap-2 p-2'>
      <NavigationToolbar actions={actions} />
      <ActionToolbar actions={actions} nodes={defaultNodeRegistry} capabilities={freehandCapabilities} />
      <CameraToolbar actions={actions}>
        {Math.round(zoom * 100)}% · snap {snap ? 'on' : 'off'} · guides {guides ? 'on' : 'off'} · debug{' '}
        {debug ? 'on' : 'off'}
      </CameraToolbar>
      <pre className='text-xs text-fg-muted'>{log.join('\n')}</pre>
    </div>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas/scene/Toolbar',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

export const Default: StoryObj = {};
