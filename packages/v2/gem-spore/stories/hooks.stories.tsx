//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { Knobs, KnobsProvider, useButton } from '@dxos/esbuild-book-knobs';
import {
  FullScreen,
  SVGContextProvider,
  defaultGridStyles,
  useGrid,
  useSvgContext,
  useZoom
} from '@dxos/gem-core';

import {
  GraphForceProjector,
  TestGraphModel,
  GraphLink,
  GraphNode,
  GraphRenderer,
  TestNode,
  convertToGraphData,
  convertTreeToGraph,
  createMarkers,
  createSimulationDrag,
  createTree,
  defaultGraphStyles,
  defaultMarkerStyles,
  linkerRenderer,
} from '../src';
import { styles } from './helpers';

export default {
  title: 'gem-x/hooks'
};

// TODO(burdon): Dynamic classname for nodes (e.g., based on selection).
// TODO(burdon): Create links.
// TODO(burdon): Delete nodes (alt-click).

interface ComponentProps {
  model: TestGraphModel
}

const PrimaryComponent = ({ model }: ComponentProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();
  const grid = useGrid();
  const zoom = useZoom();

  const { projector, renderer } = useMemo(() => ({
    projector: new GraphForceProjector(context),
    renderer: new GraphRenderer(context, graphRef)
  }), []);

  useEffect(() => {
    const unsubscribe = model.updated.on(graph => {
      projector.update(convertToGraphData(graph));
    });

    projector.updated.on(({ layout }) => {
      renderer.update(layout);
    });

    projector.start();
    model.update();

    return () => {
      unsubscribe();
      projector.stop();
    }
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
      <g ref={grid.ref} className={defaultGridStyles} />
      <g ref={zoom.ref} className={defaultGraphStyles}>
        <g ref={graphRef} />
      </g>
    </svg>
  );
};

const SecondaryComponent = ({ model }: ComponentProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();
  const grid = useGrid();
  const zoom = useZoom({ extent: [1, 2] });
  const markersRef = useRef<SVGGElement>();

  useButton('Test', () => {
    model.createNodes();
  });

  const { projector, renderer } = useMemo(() => {
    const projector = new GraphForceProjector<TestNode>(context, {
      guides: true,
      forces: {
        manyBody: {
          strength: (count: number) => -100 -(count * 30)
        },
        center: true,
        link: {
          distance: 60
        }
      }
    });

    // TODO(burdon): Create class?
    const drag = createSimulationDrag(context, projector._simulation, {
      onDrag: (source, target, point) => {
        linkerRenderer(graphRef.current, source, target, point);
      },
      onDrop: (source, target) => {
        linkerRenderer(graphRef.current);
        const parent = model.getNode(source.id);
        if (target) {
          const child = model.getNode(target.id);
          model.createLink(parent, child);
        } else {
          // TODO(burdon): Set start position.
          model.createNodes(parent);
        }
      }
    });

    const renderer = new GraphRenderer<TestNode>(context, zoom.ref, {
      drag,
      label: (node: GraphNode<TestNode>) => node.id.substring(0, 4),
      nodeClass: (node: GraphNode<TestNode>) => node.data.type === 'org' ? 'selected' : undefined,
      onNodeClick: (node: GraphNode<TestNode>, event: MouseEvent) => {
        renderer.fireBullet(node);
      },
      onLinkClick: (link: GraphLink<TestNode>, event: MouseEvent) => {
        if (event.metaKey) {
          model.deleteLink(link);
        }
      },
      arrows: {
        end: true
      }
    });

    return {
      projector,
      renderer
    };
  }, []);

  useEffect(() => {
    const unsubscribe = model.updated.on(graph => {
      projector.update(convertToGraphData(graph));
    });

    projector.updated.on(({ layout }) => {
      renderer.update(layout);
    });

    projector.start();
    model.update();

    return () => {
      unsubscribe();
      projector.stop();
    }
  }, []);

  useEffect(() => {
    d3.select(markersRef.current).call(createMarkers());
  }, [markersRef]);

  return (
    <svg ref={context.ref}>
      <defs ref={markersRef} className={defaultMarkerStyles} />
      <g ref={grid.ref} className={defaultGridStyles} />
      <g ref={zoom.ref} className={clsx(defaultGraphStyles, styles.linker)}>
        <g ref={graphRef} />
      </g>
    </svg>
  );
};

export const Primary = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 3 }))), []);

  return (
    <FullScreen>
      <SVGContextProvider>
        <PrimaryComponent model={model} />
      </SVGContextProvider>
    </FullScreen>
  );
}

const Info = () => (
  <div
    style={{
      position: 'absolute',
      left: 8,
      bottom: 8,
      fontFamily: 'sans-serif',
      color: '#333'
    }}
  >
    ⌘-DRAG to link or create node; ⌘-CLICK to delete link.
  </div>
);

export const Secondary = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 3 }))), []);

  return (
    <FullScreen>
      <KnobsProvider>
        <SVGContextProvider>
          <SecondaryComponent model={model} />
        </SVGContextProvider>
        <Info />
        <Knobs className={styles.knobs} />
      </KnobsProvider>
    </FullScreen>
  );
}
