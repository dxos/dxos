//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import { select } from 'd3';
import React, { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { log } from '@dxos/log';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { SVG } from '../components';
import {
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphLayoutEdge,
  GraphRenderer,
  type GraphForceProjectorOptions,
  createMarkers,
  createGraphDrag,
  linkerRenderer,
} from '../graph';
import { useSvgContext, useZoom, useGrid } from '../hooks';
import { convertTreeToGraph, createTree, TestGraphModel, type TestNode } from '../testing';

import '../../styles/graph.css';

type StoryProps = PropsWithChildren<{
  model: TestGraphModel;
  projectorOptions?: GraphForceProjectorOptions;
  count?: number;
  interval?: number;
  link?: boolean;
  grid?: boolean;
}>;

const DefaultStory = ({ children, ...props }: StoryProps) => {
  return (
    <>
      <SVG.Root>
        <StoryComponent {...props} />
      </SVG.Root>
      {children && <div className='absolute left-4 bottom-4 font-mono text-green-500 text-xs'>{children}</div>}
    </>
  );
};

const StoryComponent = ({
  model,
  projectorOptions,
  count = 0,
  interval = 200,
  link = false,
  grid: showGrid = false,
}: StoryProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();
  const markersRef = useRef<SVGGElement>();
  const grid = useGrid({ visible: showGrid });
  const zoom = useZoom();

  const { projector, renderer } = useMemo(() => {
    const projector = new GraphForceProjector(context, projectorOptions);
    let renderer: GraphRenderer<TestNode>;
    if (!link) {
      renderer = new GraphRenderer(context, graphRef);
    } else {
      const drag = createGraphDrag(context, projector, {
        onDrag: (source, target, point) => {
          select(graphRef.current).call(linkerRenderer, { source, target, point });
        },
        onDrop: (source, target) => {
          log('onDrop', { source: source.id, target: target?.id });
          select(graphRef.current).call(linkerRenderer);
          const parent = model.getNode(source.id);
          if (target) {
            const child = model.getNode(target.id);
            model.addEdge({ source: parent.id, target: child.id });
          } else {
            // TODO(burdon): Set start position.
            model.createNodes(parent);
          }
        },
      });

      renderer = new GraphRenderer<TestNode>(context, graphRef, {
        drag,
        arrows: {
          end: true,
        },
        labels: {
          text: (node: GraphLayoutNode<TestNode>) => node.id.substring(0, 4),
        },
        onNodeClick: (node: GraphLayoutNode<TestNode>, event: MouseEvent) => {
          renderer.fireBullet(node);
        },
        onLinkClick: (edge: GraphLayoutEdge<TestNode>, event: MouseEvent) => {
          if (event.metaKey) {
            model.removeEdge(edge.id);
          }
        },
      });
    }

    return {
      projector,
      renderer,
    };
  }, [link]);

  useEffect(() => {
    select(markersRef.current).call(createMarkers());
  }, [markersRef]);

  useEffect(() => {
    void projector.start();
    return combine(
      model.subscribe((graph) => projector.updateData(graph)),
      projector.updated.on(({ layout }) => renderer.render(layout)),
      () => projector.stop(),
    );
  }, []);

  useEffect(() => {
    if (!count) {
      return;
    }

    const i = setInterval(() => {
      if (model.graph.nodes.length > count) {
        clearInterval(i);
      }

      model.createNodes(model.getRandomNode());
    }, interval);

    return () => clearInterval(i);
  }, [count, interval]);

  return (
    <>
      <defs ref={markersRef} />
      <g ref={grid.ref} className='dx-grid' />
      <g ref={zoom.ref}>
        <g ref={graphRef} className='dx-graph' />
      </g>
    </>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-graph/hooks',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {
  args: {
    model: new TestGraphModel(convertTreeToGraph(createTree({ depth: 3 }))),
    grid: true,
    count: 300,
    interval: 20,
    projectorOptions: {
      guides: true,
      forces: {
        link: {
          distance: 30,
          iterations: 5,
        },
        manyBody: {
          strength: -50,
        },
        radial: {
          strength: 0.2,
          radius: 150,
        },
      },
    },
  },
};

export const Bullets: Story = {
  args: {
    model: new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))),
    children: <span>⌘-DRAG to edge or create node; ⌘-CLICK to delete edge.</span>,
    link: true,
    grid: false,
    projectorOptions: {
      guides: true,
      forces: {
        link: {
          distance: 50,
          iterations: 5,
        },
        manyBody: {
          strength: -50,
        },
        radial: {
          strength: 0.1,
          radius: 150,
        },
      },
    },
  },
};
