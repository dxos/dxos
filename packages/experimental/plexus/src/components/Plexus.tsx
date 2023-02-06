//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import { Aperture } from 'phosphor-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Grid, SVG, SVGContextProvider, useSvgContext, Zoom } from '@dxos/gem-core';
import { GraphLayoutNode, GraphModel, GraphNode, GraphRenderer, Markers } from '@dxos/gem-spore';
import { mx } from '@dxos/react-components';

import { usePlexusState } from '../hooks';
import { TreeProjector } from './tree-projector';

const transitionDuration = 300;

export type PlexusProps<N extends GraphNode> = {
  model: GraphModel<N>;
  onSelect?: (node: N) => void;
};

export const Plexus = <N extends GraphNode>({ model, onSelect }: PlexusProps<N>) => {
  const { transition } = usePlexusState();
  const [visible, setVisible] = useState(true);
  const [spin, setSpin] = useState(true);
  const timeout = useRef<[any, any]>([0, 0]);
  useEffect(() => {
    setVisible(false);
    setSpin(true);

    clearTimeout(timeout.current[0]);
    const t1 = setTimeout(() => {
      setVisible(true);
    }, transitionDuration);

    clearTimeout(timeout.current[1]);
    const t2 = setTimeout(() => {
      setSpin(false);
    }, 2500);

    timeout.current = [t1, t2];
  }, [transition]);

  return (
    <SVGContextProvider>
      <SVG className={mx('bg-slate-800')}>
        <Markers
          arrowSize={6}
          className='[&>marker>path]:stroke-slate-700 [&>marker>path]:stroke-[1px] [&>marker>path]:fill-transparent'
        />
        <Grid className='[&>path]:stroke-slate-700 [&>path]:stroke-[1px] [&>path]:opacity-40' />
        <Zoom extent={[1, 4]}>
          <g className={mx('visible', !visible && 'invisible')}>
            <line className='stroke-slate-700 stroke-[3px]' x1={0} y1={0} x2={600} y2={0} />
          </g>
          <PlexGraph
            className={mx(
              // TODO(burdon): Move to slots.
              '[&>g>circle]:fill-transparent [&>g>circle]:stroke-slate-700 [&>g>circle]:stroke-[1px] [&>g>circle]:opacity-70'
            )}
            model={model}
            onSelect={onSelect}
          />
          <g
            className={mx(
              'visible',
              !visible && 'invisible',
              visible && spin && 'animate-[spin_2s] __animate-[ping_2s]' // TODO(burdon): Ping on start.
            )}
          >
            <Aperture x={-64} y={-64} width={128} height={128} className='[&>*]:stroke-1 [&>*]:opacity-50' />
          </g>
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};

export type PlexGraphProps<N extends GraphNode> = {
  model: GraphModel<N>;
  className?: string;
  onSelect?: (node: N) => void;
};

export const PlexGraph = <N extends GraphNode>({ model, className, onSelect }: PlexGraphProps<N>) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>(null);

  // Layout projector.
  const projector = useMemo(
    () =>
      new TreeProjector<N>(context, {
        radius: 192,
        nodeRadius: 16,
        slots: {
          // TODO(burdon): Factor out styles/slots: 300, 500, 700, 800.
          root: '[&>circle]:fill-slate-800 [&>circle]:stroke-[3px] [&>circle]:stroke-slate-500 [&>text]:fill-slate-500',
          node: '[&>circle]:fill-slate-800 [&>circle]:stroke-[2px] [&>circle]:stroke-slate-300 [&>text]:fill-slate-500',
          link: '[&>path]:stroke-[2px] [&>path]:stroke-slate-700'
        }
      }),
    []
  );

  // Graph renderer.
  const renderer = useMemo(
    () =>
      new GraphRenderer(context, graphRef, {
        transition: () => d3.transition().duration(transitionDuration).ease(d3.easeLinear),
        labels: {
          text: (node) => node.id.slice(0, 8) // + `[${node.data.label}]`
        },
        arrows: { end: true },
        onNodeClick: (node: GraphLayoutNode<N>) => {
          onSelect?.(node.data!);
        }
      }),
    []
  );

  const [data, setData] = useState(model.graph);
  useEffect(() => {
    model.subscribe((graph) => {
      setData({ ...graph });
    });
  }, [model]);

  useEffect(() => {
    if (graphRef.current) {
      projector.update(model.graph, model.selected);
      renderer.update(projector.layout);
    }
  }, [graphRef, data]);

  return <g ref={graphRef} className={className} />;
};
