//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { effect } from '@preact/signals-core';
import { type StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type GraphModel, SelectionModel, type Graph } from '@dxos/graph';
import { Toolbar } from '@dxos/react-ui';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph as GraphComponent, type GraphController, type GraphProps } from './Graph';
import { GraphForceProjector, type GraphForceProjectorOptions, type GraphLayoutNode } from '../../graph';
import { type SVGContext } from '../../hooks';
import { convertTreeToGraph, createGraph, createTree, TestGraphModel, type TestNode } from '../../testing';
import { SVG } from '../SVG';

import '../../../styles/graph.css';

type DefaultStoryProps = GraphProps & {
  debug?: boolean;
  grid?: boolean;
  graph: Graph;
  projectorOptions?: GraphForceProjectorOptions;
};

const DefaultStory = ({ debug, grid, graph, projectorOptions, ...props }: DefaultStoryProps) => {
  const graphRef = useRef<GraphController | null>(null);
  const model = useMemo(() => new TestGraphModel(graph), [graph]);
  const selected = useMemo(() => new SelectionModel(), []);
  const context = useRef<SVGContext>(null);
  const projector = useMemo<GraphForceProjector>(
    () => context.current && projectorOptions && new GraphForceProjector(context.current, projectorOptions),
    [context.current, projectorOptions],
  );

  return (
    <div className={mx('w-full grid divide-x divide-separator', debug && 'grid-cols-[1fr_30rem]')}>
      <SVG.Root ref={context}>
        <SVG.Markers />
        {grid && <SVG.Grid axis />}
        <SVG.Zoom extent={[1 / 4, 4]}>
          <GraphComponent
            ref={graphRef}
            model={model}
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode<TestNode>) => node.data.label,
            }}
            attributes={{
              node: (node: GraphLayoutNode<TestNode>) => ({
                classes: {
                  'dx-selected': selected.contains(node.id),
                },
              }),
            }}
            onSelect={(node: GraphLayoutNode<TestNode>) => {
              if (selected.contains(node.id)) {
                selected.remove(node.id);
              } else {
                selected.add(node.id);
              }
              graphRef.current?.refresh();
            }}
            {...props}
          />
        </SVG.Zoom>
      </SVG.Root>

      {debug && (
        <Debug
          model={model}
          selected={selected}
          onAdd={() => {
            if (graph.nodes.length) {
              const source = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
              const target = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
              if (source !== target) {
                model.addEdge({ source: source.id, target: target.id });
              }
            }
          }}
          onDelete={() => {
            const node = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
            if (node) {
              // TODO(burdon): Throws error.
              model.removeNode(node.id);
            }
          }}
        />
      )}
    </div>
  );
};

const Debug = ({
  model,
  selected,
  onAdd,
  onDelete,
}: {
  model: GraphModel;
  selected: SelectionModel;
  onAdd: () => void;
  onDelete: () => void;
}) => {
  const [data, setData] = useState({});
  useEffect(() => {
    effect(() => {
      setData({
        selected: selected.toJSON(),
        model: model.toJSON(),
      });
    });
  }, [model, selected]);

  return (
    <div className='flex flex-col overflow-hidden'>
      <JsonFilter data={data} classNames='text-sm' />
      <Toolbar.Root>
        <Toolbar.Button onClick={onAdd}>Add</Toolbar.Button>
        <Toolbar.Button onClick={onDelete}>Delete</Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
};

const meta: Meta<DefaultStoryProps> = {
  title: 'ui/react-ui-graph/Graph',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<DefaultStoryProps>;

// TODO(burdon): Enable filtering of links that affect the force.

export const Default: Story = {
  args: {
    debug: true,
    graph: convertTreeToGraph(createTree({ depth: 4 })),
    drag: true,
    arrows: true,
    grid: true,
  },
};

export const Force: Story = {
  args: {
    debug: true,
    graph: convertTreeToGraph(createTree({ depth: 5 })),
    drag: true,
    delay: 500,
    projectorOptions: {
      guides: true,
      attributes: {
        radius: (node, count) => 3 + Math.log(count + 1) * 3,
      },
      radius: 400,
      forces: {
        center: {
          strength: 0.6,
        },
        collide: {
          strength: 1,
        },
        manyBody: {
          strength: -80,
        },
        link: {
          distance: 20,
          iterations: 10,
          strength: 0.2,
        },
        radial: {
          delay: 500,
          radius: 300,
          strength: 0.5,
        },
      },
    },
  },
};

export const Select: Story = {
  args: {
    debug: true,
    graph: createGraph(150, 50),
    drag: true,
    projectorOptions: {
      forces: {
        radial: {
          radius: 200,
          strength: 0.05,
        },
      },
    },
  },
};

export const Groups: Story = {
  args: {
    debug: true,
    graph: createGraph(50, 30),
    drag: true,
    subgraphs: true,
    projectorOptions: {
      forces: {
        radial: {
          radius: 200,
          strength: 0.05,
        },
      },
    },
  },
};
