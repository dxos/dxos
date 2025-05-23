//
// Copyright 2020 DXOS.org
//

import '@dxos-theme';

import { select } from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { defaultGridStyles, useGrid, useSvgContext, useZoom, SVGRoot } from '@dxos/gem-core';
import { useThemeContext } from '@dxos/react-ui';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { defaultStyles } from './styles';
import {
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphLayoutLink,
  GraphRenderer,
  createMarkers,
  createSimulationDrag,
  linkerRenderer,
} from '../graph';
import { convertTreeToGraph, createTree, TestGraphModel, type TestNode } from '../testing';

import '../../styles/defaults.css';

const meta: Meta = {
  title: 'experimental/gem-spore/hooks',
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

interface ComponentProps {
  model: TestGraphModel;
}

const PrimaryComponent = ({ model }: ComponentProps) => {
  const { themeMode } = useThemeContext();
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
    const unsubscribeModel = model.updated.on((graph) => projector.update(graph));
    const unsubscribeProjector = projector.updated.on(({ layout }) => renderer.update(layout));
    void projector.start();
    model.triggerUpdate();

    return () => {
      unsubscribeModel();
      unsubscribeProjector();
      void projector.stop();
    };
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
    <svg ref={context.ref} className={defaultStyles}>
      <g ref={grid.ref} className={defaultGridStyles(themeMode)} />
      <g ref={zoom.ref}>
        <g ref={graphRef} />
      </g>
    </svg>
  );
};

const SecondaryComponent = ({ model }: ComponentProps) => {
  const { themeMode } = useThemeContext();
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();
  const grid = useGrid();
  const zoom = useZoom({ extent: [1, 2] });
  const markersRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = new GraphForceProjector<TestNode>(context, {
      guides: true,
      forces: {
        link: {
          distance: 40,
        },
        manyBody: {
          strength: -80,
        },
      },
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
      },
    });

    const renderer = new GraphRenderer<TestNode>(context, zoom.ref, {
      drag,
      labels: {
        text: (node: GraphLayoutNode<TestNode>) => node.id.substring(0, 4),
      },
      onNodeClick: (node: GraphLayoutNode<TestNode>, event: MouseEvent) => {
        renderer.fireBullet(node);
      },
      onLinkClick: (link: GraphLayoutLink<TestNode>, event: MouseEvent) => {
        if (event.metaKey) {
          model.deleteLink(link.id);
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
    const unsubscribeModel = model.updated.on((graph) => projector.update(graph));
    const unsubscribeProjector = projector.updated.on(({ layout }) => renderer.update(layout));
    void projector.start();
    model.triggerUpdate();

    return () => {
      unsubscribeModel();
      unsubscribeProjector();
      void projector.stop();
    };
  }, []);

  useEffect(() => {
    select(markersRef.current).call(createMarkers());
  }, [markersRef]);

  return (
    <svg ref={context.ref} className={defaultStyles}>
      <defs ref={markersRef} />
      <g ref={grid.ref} className={defaultGridStyles(themeMode)} />
      <g ref={zoom.ref}>
        <g ref={graphRef} />
      </g>
    </svg>
  );
};

const Info = () => (
  <div className='absolute left-4 bottom-4 font-mono text-green-500 text-xs'>
    ⌘-DRAG to link or create node; ⌘-CLICK to delete link.
  </div>
);

export const Default = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 3 }))), []);

  return (
    <SVGRoot>
      <PrimaryComponent model={model} />
    </SVGRoot>
  );
};

export const Bullets = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 3 }))), []);

  return (
    <>
      <SVGRoot>
        <SecondaryComponent model={model} />
      </SVGRoot>
      <Info />
    </>
  );
};
