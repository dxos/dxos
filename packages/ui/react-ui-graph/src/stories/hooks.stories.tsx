//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import { select } from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { log } from '@dxos/log';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { SVGRoot } from '../components';
import {
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphLayoutEdge,
  GraphRenderer,
  createMarkers,
  createSimulationDrag,
  linkerRenderer,
} from '../graph';
import { useSvgContext, useZoom, useGrid } from '../hooks';
import { convertTreeToGraph, createTree, TestGraphModel, type TestNode } from '../testing';

import '../../styles/graph.css';

type ComponentProps = {
  model: TestGraphModel;
};

const DefaultStory = ({ model }: ComponentProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();
  const grid = useGrid();
  const zoom = useZoom();

  const { projector, renderer } = useMemo(
    () => ({
      projector: new GraphForceProjector(context, {
        forces: {
          link: {
            distance: 20,
            iterations: 3,
          },
          manyBody: {
            strength: -10,
          },
        },
      }),
      renderer: new GraphRenderer(context, graphRef),
    }),
    [],
  );

  useEffect(() => {
    void projector.start();
    return combine(
      model.subscribe((graph) => projector.update(graph)),
      projector.updated.on(({ layout }) => renderer.update(layout)),
      () => projector.stop(),
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (model.graph.nodes.length > 200) {
        clearInterval(interval);
      }

      model.createNodes(model.getRandomNode());
    }, 10);

    return () => clearInterval(interval);
  }, []);

  return (
    <svg ref={context.ref}>
      <g ref={grid.ref} className='dx-grid' />
      <g ref={zoom.ref}>
        <g ref={graphRef} className='dx-graph' />
      </g>
    </svg>
  );
};

// TODO(burdon): Merge with DefaultStory.
const SecondaryComponent = ({ model }: ComponentProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();
  const grid = useGrid();
  const zoom = useZoom({ extent: [1 / 2, 2] });
  const markersRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = new GraphForceProjector(context, {
      guides: true,
      forces: {
        link: {
          distance: 20,
        },
        manyBody: {
          strength: -80,
        },
      },
    });

    const drag = createSimulationDrag(context, projector.simulation, {
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

    const renderer = new GraphRenderer<TestNode>(context, graphRef, {
      drag,
      labels: {
        text: (node: GraphLayoutNode<TestNode>) => node.id.substring(0, 4),
      },
      onNodeClick: (node: GraphLayoutNode<TestNode>, event: MouseEvent) => {
        renderer.fireBullet(node);
      },
      onEdgeClick: (edge: GraphLayoutEdge<TestNode>, event: MouseEvent) => {
        if (event.metaKey) {
          model.removeEdge(edge.id);
        }
      },
      arrows: {
        end: true,
      },
    });

    return {
      projector,
      renderer,
    };
  }, []);

  useEffect(() => {
    void projector.start();
    return combine(
      model.subscribe((graph) => projector.update(graph)),
      projector.updated.on(({ layout }) => renderer.update(layout)),
      () => projector.stop(),
    );
  }, []);

  useEffect(() => {
    select(markersRef.current).call(createMarkers());
  }, [markersRef]);

  return (
    <svg ref={context.ref}>
      <defs ref={markersRef} />
      <g ref={grid.ref} className='dx-grid' />
      <g ref={zoom.ref}>
        <g ref={graphRef} className='dx-graph' />
      </g>
    </svg>
  );
};

const Info = () => (
  <div className='absolute left-4 bottom-4 font-mono text-green-500 text-xs'>
    ⌘-DRAG to edge or create node; ⌘-CLICK to delete edge.
  </div>
);

const meta: Meta = {
  title: 'ui/react-ui-graph/hooks',
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 3 }))), []);

  return (
    <SVGRoot>
      <DefaultStory model={model} />
    </SVGRoot>
  );
};

export const Bullets = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <>
      <SVGRoot>
        <SecondaryComponent model={model} />
      </SVGRoot>
      <Info />
    </>
  );
};
