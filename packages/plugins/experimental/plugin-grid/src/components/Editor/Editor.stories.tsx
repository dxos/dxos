//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Editor, type EditorRootProps } from './Editor';
import { createSnap, type Dimension } from '../../layout';
import { createGraph } from '../../testing';

const Render = (props: EditorRootProps) => (
  <Editor.Root {...props}>
    <Editor.Canvas />
    <Editor.UI />
  </Editor.Root>
);

const meta: Meta<EditorRootProps> = {
  title: 'plugins/plugin-grid/Editor',
  component: Editor.Root,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

const itemSize: Dimension = { width: 128, height: 64 };
const snapPoint = createSnap({ width: itemSize.width + 64, height: itemSize.height + 64 });

export const Default = {
  args: {
    graph: createGraph(itemSize, snapPoint),
  },
};
