//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import defaulstDeep from 'lodash.defaultsdeep';
import { Aperture } from 'phosphor-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useSvgContext } from '@dxos/gem-core';
import { GraphLayoutNode, GraphModel, GraphRenderer, GraphRendererOptions } from '@dxos/gem-spore';
import { mx } from '@dxos/react-components';

import { TreeProjector, TreeProjectorOptions } from './tree-projector';
import { useTimeout } from './util';

const transitionDuration = 300;

export type PlexusSlots<N> = {
  root?: {
    className?: string;
  };
  thorax?: {
    className?: string;
  };
  projector?: Partial<TreeProjectorOptions>;
  renderer?: Partial<GraphRendererOptions<N>>;
};

export type PlexusProps<N> = {
  model: GraphModel<N>;
  className?: string;
  slots?: PlexusSlots<N>;
  onSelect?: (node: N) => void;
  onTransition?: (transitioning: boolean) => void; // TODO(burdon): Generic state change.
};

/**
 * SVG graph layout.
 */
export const Plexus = <N,>({ model, slots, onSelect, onTransition }: PlexusProps<N>) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>(null);

  // Display state.
  // TODO(burdon): Spinning animation does not reset on trigger.
  const [invisible, triggerInvisible] = useTimeout(transitionDuration, onTransition);
  const [spin, triggerSpin] = useTimeout(2000);
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    triggerInvisible();
    triggerSpin();
  }, [selected]);

  // Layout projector.
  const projector = useMemo(
    () =>
      // TODO(burdon): Factor out options to story.
      new TreeProjector<N>(
        context,
        defaulstDeep({}, slots?.projector, {
          idAccessor: model.idAccessor
        })
      ),
    []
  );

  // Graph renderer.
  const renderer = useMemo(
    () =>
      new GraphRenderer(
        context,
        graphRef,
        defaulstDeep({}, slots?.renderer, {
          idAccessor: model.idAccessor,
          transition: () => d3.transition().duration(transitionDuration).ease(d3.easeLinear),
          labels: {
            text: (node: GraphLayoutNode<N>) => node.id.slice(0, 8) // + `[${node.data.label}]`
          },
          arrows: { end: true },
          onNodeClick: (node: GraphLayoutNode<N>) => {
            onSelect?.(node.data!);
          }
        })
      ),
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
    <g className={'[&>*]:fill-transparent [&>*]:stroke-[1px] [&>*]:stroke-slate-500'}>
      <g ref={graphRef} className={slots?.root?.className} />;
      <g
        className={mx(
          'visible',
          invisible && 'invisible',
          spin ? 'animate-[spin_2s] __animate-[ping_2s]' : 'animate-none' // TODO(burdon): Ping on start.
        )}
      >
        <Aperture
          x={-64}
          y={-64}
          width={128}
          height={128}
          className={mx('[&>rect]:stroke-0 [&>*]:stroke-2', slots?.thorax?.className)}
        />
      </g>
    </g>
  );
};
