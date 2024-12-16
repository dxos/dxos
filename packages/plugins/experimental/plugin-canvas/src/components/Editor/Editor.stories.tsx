//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
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
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
};

export default meta;

const snapPoint = createSnap({ width: 64, height: 64 });

type Story = StoryObj<EditorRootProps>;

export const Default: Story = {
  args: {
    debug: true,
    graph: createGraph(snapPoint),
    scale: 1,
  },
};
