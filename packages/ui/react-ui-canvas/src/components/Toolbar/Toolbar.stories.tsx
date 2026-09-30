//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { freehandCapabilities } from '../../model/projection.ts';
import { defaultNodeRegistry } from '../../model/registry.ts';
import { type NodeType } from '../../model/types.ts';
import { ActionToolbar, DebugToolbar, NavigationToolbar, type ToolbarActions } from './Toolbar.tsx';

/** The bar over a fake view: every action appends to a log so each button is seen to fire. */
const DefaultStory = () => {
  const [log, setLog] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [debug, setDebug] = useState(false);
  const [zoom, setZoom] = useState(1);
  const note = (entry: string) => setLog((entries) => [entry, ...entries].slice(0, 12));
  const actions: ToolbarActions = {
    path: ['scene:root', 'scene:root/L'],
    nameOf: (id) => id.split(':')[1] ?? id,
    onPath: (index) => note(`path → ${index}`),
    fit: () => note('fit'),
    zoomIn: () => setZoom((value) => value * 1.25),
    zoomOut: () => setZoom((value) => value / 1.25),
    snap,
    toggleSnap: () => setSnap((value) => !value),
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
    <div className='flex flex-col gap-2 p-2'>
      <div className='flex justify-between gap-2'>
        <NavigationToolbar actions={actions}>depth {actions.path.length - 1}</NavigationToolbar>
        <ActionToolbar actions={actions} nodes={defaultNodeRegistry} capabilities={freehandCapabilities} />
      </div>
      <DebugToolbar>
        {Math.round(zoom * 100)}% · snap {snap ? 'on' : 'off'} · debug {debug ? 'on' : 'off'}
      </DebugToolbar>
      <pre className='text-xs text-description'>{log.join('\n')}</pre>
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
