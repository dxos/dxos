//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';

import { CanvasGraphModel, type Polygon } from '../../types';
import { Editor } from '../Editor';

import { GraphCanvas, type GraphCanvasProps } from './GraphCanvas';

// TODO(burdon): Story with conductor nodes and local processing.
// TODO(burdon): Undo.
// TODO(burdon): Customize database schema: https://reactflow.dev/ui/components/database-schema-node
// TODO(burdon): Cards/info cards.

// TODO(burdon): Editor inside node.
// TODO(burdon): Tool palette.
// TODO(burdon): DevTools (copy from shadcn).
// TOOD(burdon): Animated edges.
// TODO(burdon): Groups (hierarchical).
// TODO(burdon): Resize.
// TODO(burdon): Auto-layout.

const DefaultStory = (props: GraphCanvasProps) => {
  const [graph, setGraph] = useState<CanvasGraphModel>();

  useEffect(() => {
    const init = async () => {
      // TODO(burdon): Make reactive (createObject).
      const model = CanvasGraphModel.create<Polygon>({
        nodes: [
          {
            id: 'node-1',
            type: 'rectangle',
            text: 'Node 1',
            center: { x: 0, y: 0 },
            size: { width: 128, height: 64 },
            data: {},
          },
          {
            id: 'node-2',
            type: 'rectangle',
            text: 'Node 2',
            center: { x: 256, y: 64 },
            size: { width: 128, height: 96 },
            data: {},
          },
        ] as Polygon[],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
          },
        ],
      });

      setGraph(model);
    };

    void init();
  }, []);

  if (!graph) {
    return null;
  }

  return (
    <div className='flex is-full bs-full absolute inset-0'>
      <Editor.Root id='story' graph={graph}>
        <GraphCanvas {...props} />
      </Editor.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas-editor/GraphCanvas',
  component: GraphCanvas,
  render: render(DefaultStory),
  decorators: [withTheme],
} satisfies Meta<typeof GraphCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    grid: 'grid',
  },
};
