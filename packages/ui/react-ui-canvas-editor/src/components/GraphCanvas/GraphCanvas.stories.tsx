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

const DefaultStory = (props: GraphCanvasProps) => {
  const [graph, setGraph] = useState<CanvasGraphModel>();

  useEffect(() => {
    const init = async () => {
      // Manually create graph with shapes.
      const model = CanvasGraphModel.create<Polygon>({
        nodes: [
          {
            id: '1',
            type: 'rectangle',
            text: 'Node 1',
            center: { x: 0, y: 0 },
            size: { width: 100, height: 50 },
            data: {},
          },
          {
            id: '2',
            type: 'rectangle',
            text: 'Node 2',
            center: { x: 200, y: 100 },
            size: { width: 100, height: 50 },
            data: {},
          },
        ] as Polygon[],
        edges: [
          {
            id: 'e1-2',
            source: '1',
            target: '2',
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

export const Default: Story = {};
