//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import { Aperture } from 'phosphor-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useSvgContext } from '@dxos/gem-core';
import { GraphLayoutNode, GraphModel, GraphRenderer } from '@dxos/gem-spore';
import { mx } from '@dxos/react-components';

import { TreeProjector } from './tree-projector';
import { useTimeout } from './util';

const transitionDuration = 300;

export type PlexusClasses = {
  root?: string;
};

export type PlexusSlots = {
  root?: {
    className: string;
  };
};

export type PlexusProps<N> = {
  model: GraphModel<N>;
  className?: string;
  onSelect?: (node: N) => void;
  onSpin?: (spin: boolean) => void; // TODO(burdon): Generic state change.
};

/**
 * SVG graph layout.
 */
export const Plexus = <N,>({ model, className, onSelect, onSpin }: PlexusProps<N>) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>(null);

  // Display state.
  // TODO(burdon): Spinning animation does not reset on trigger.
  const [invisible, triggerInvisible] = useTimeout(transitionDuration);
  const [spin, triggerSpin] = useTimeout(2000, onSpin);
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    triggerInvisible();
    triggerSpin();
  }, [selected]);

  // Layout projector.
  const projector = useMemo(
    () =>
      new TreeProjector<N>(context, {
        idAccessor: model.idAccessor,
        radius: 192,
        nodeRadius: 16,
        classes: {
          // TODO(burdon): Base styles via: [&>*].
          // TODO(burdon): Factor out styles/classes: 300, 500, 700, 800.
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
        idAccessor: model.idAccessor,
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

  // Subscribe to model.
  const [data, setData] = useState(model.graph);
  useEffect(() => {
    model.subscribe((graph) => {
      setData({ ...graph });
      setSelected(model.selected);
    });
  }, [model]);

  // Trigger layout.
  useEffect(() => {
    if (graphRef.current) {
      projector.update(model.graph, model.selected);
      renderer.update(projector.layout);
    }
  }, [graphRef, data]);

  return (
    <g>
      <g ref={graphRef} className={className} />;
      <g
        className={mx(
          'visible',
          invisible && 'invisible',
          spin ? 'animate-[spin_2s] __animate-[ping_2s]' : 'animate-none' // TODO(burdon): Ping on start.
        )}
      >
        <Aperture x={-64} y={-64} width={128} height={128} className='[&>*]:stroke-1 [&>*]:opacity-50' />
      </g>
    </g>
  );
};
