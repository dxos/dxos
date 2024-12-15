//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorRootProps } from './Editor';
import { createSnap } from '../../hooks';
import { createGraph } from '../../testing';

const Render = (props: EditorRootProps) => (
  <Editor.Root {...props}>
    <Editor.Canvas />
    <Editor.UI />
  </Editor.Root>
);

const meta: Meta<EditorRootProps> = {
  title: 'plugins/plugin-canvas/Editor',
  component: Editor.Root,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

const snapPoint = createSnap({ width: 64, height: 64 });

export const Default = {
  args: {
    graph: createGraph(snapPoint),
  },
};
