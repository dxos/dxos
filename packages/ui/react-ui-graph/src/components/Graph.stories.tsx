//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { type Graph } from '@dxos/graph';
import { useThemeContext } from '@dxos/react-ui';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { Graph as GraphComponent, type GraphProps } from './Graph';
import { Grid } from './Grid';
import { Markers } from './Markers';
import { SVG } from './SVG';
import { SVGRoot } from './SVGRoot';
import { Zoom } from './Zoom';
import { GraphForceProjector, type GraphForceProjectorOptions, type GraphLayoutNode } from '../graph';
import { createSvgContext } from '../hooks';
import { defaultGridStyles } from '../styles';
import { convertTreeToGraph, createGraph, createTree, seed, TestGraphModel, type TestNode } from '../testing';

import '../../styles/defaults.css';

seed(1);

type DefaultStoryProps = GraphProps & {
  grid?: boolean;
  graph: Graph;
  projectorOptions?: GraphForceProjectorOptions;
};

const DefaultStory = ({ grid, graph, projectorOptions, ...props }: DefaultStoryProps) => {
  const { themeMode } = useThemeContext();
  const model = useMemo(() => new TestGraphModel(graph), [graph]);
  // TODO(burdon): Change to SelectionModel (react-ui-canvas-editor).
  const selected = useMemo(() => new Set(), []);
  const context = createSvgContext();
  const projector = useMemo(
    () => projectorOptions && new GraphForceProjector(context, projectorOptions),
    [projectorOptions],
  );

  return (
    <SVGRoot context={context}>
      <SVG>
        <Markers />
        {grid && <Grid axis className={defaultGridStyles(themeMode)} />}
        <Zoom extent={[1 / 2, 2]}>
          <GraphComponent
            model={model}
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode<TestNode>, highlight: boolean) => {
                return highlight || selected.has(node.id) ? node.data.label : undefined;
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<TestNode>) => ({
                class: selected.has(node.id) ? 'selected' : undefined,
              }),
            }}
            onSelect={(node: GraphLayoutNode<TestNode>) => {
              if (selected.has(node.id)) {
                selected.delete(node.id);
              } else {
                selected.add(node.id);
              }
            }}
            {...props}
          />
        </Zoom>
      </SVG>
    </SVGRoot>
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
        radial: {
          radius: 300,
          strength: 0.3,
        },
        collide: {
          strength: 0.9,
        },
        manyBody: {
          strength: -100,
        },
        link: {
          distance: 20,
          iterations: 5,
          strength: 0.1,
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
