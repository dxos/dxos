//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { type GraphModel, SelectionModel, type Graph } from '@dxos/graph';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph as GraphComponent, type GraphProps } from './Graph';
import { Grid } from './Grid';
import { Markers } from './Markers';
import { SVG } from './SVG';
import { SVGRoot } from './SVGRoot';
import { Zoom } from './Zoom';
import { GraphForceProjector, type GraphForceProjectorOptions, type GraphLayoutNode } from '../graph';
import { createSvgContext } from '../hooks';
import { convertTreeToGraph, createGraph, createTree, seed, TestGraphModel, type TestNode } from '../testing';

import '../../styles/graph.css';

seed(1);

type DefaultStoryProps = GraphProps & {
  grid?: boolean;
  graph: Graph;
  projectorOptions?: GraphForceProjectorOptions;
  debug?: boolean;
};

const DefaultStory = ({ grid, graph, projectorOptions, debug, ...props }: DefaultStoryProps) => {
  const model = useMemo(() => new TestGraphModel(graph), [graph]);
  const selected = useMemo(() => new SelectionModel(), []);
  const context = createSvgContext();
  const projector = useMemo(
    () => projectorOptions && new GraphForceProjector(context, projectorOptions),
    [projectorOptions],
  );

  return (
    <div className={mx('w-full grid divide-x divide-separator', debug && 'grid-cols-[1fr_30rem]')}>
      <SVGRoot context={context}>
        <SVG>
          <Markers />
          {grid && <Grid axis />}
          <Zoom extent={[1 / 2, 2]}>
            <GraphComponent
              model={model}
              projector={projector}
              labels={{
                text: (node: GraphLayoutNode<TestNode>) => node.data.label,
              }}
              attributes={{
                node: (node: GraphLayoutNode<TestNode>) => ({
                  class: selected.contains(node.id) ? 'selected' : undefined,
                }),
              }}
              onSelect={(node: GraphLayoutNode<TestNode>) => {
                if (selected.contains(node.id)) {
                  selected.remove(node.id);
                } else {
                  selected.contains(node.id);
                }
              }}
              {...props}
            />
          </Zoom>
        </SVG>
      </SVGRoot>

      {debug && <Debug model={model} />}
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
    graph: convertTreeToGraph(createTree({ depth: 4 })),
    drag: true,
    arrows: true,
    grid: true,
  },
};

export const Force: Story = {
  args: {
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
          strength: 0.7,
        },
        collide: {
          strength: 1,
        },
        manyBody: {
          strength: -100,
        },
        link: {
          distance: 20,
          iterations: 25,
          strength: 0.1,
        },
        radial: {
          delay: 300,
          radius: 300,
          strength: 0.6,
        },
      },
    },
  },
};

export const Select = {
  args: {
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

// TODO(burdon): Very expensive.
const Debug = ({ model }: { model: GraphModel }) => {
  return <JsonFilter data={model.toJSON()} classNames='text-sm' />;
};
