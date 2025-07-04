//
// Copyright 2023 DXOS.org
//

import { Aperture } from '@phosphor-icons/react';
import { transition, easeLinear } from 'd3';
import defaulstDeep from 'lodash.defaultsdeep';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ReactiveGraphModel } from '@dxos/graph';
import { type GraphLayoutNode, GraphRenderer, type GraphRendererOptions, useSvgContext } from '@dxos/react-ui-graph';
import { mx } from '@dxos/react-ui-theme';

import { TreeProjector, type TreeProjectorOptions } from './tree-projector';
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
  model: ReactiveGraphModel;
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
          // idAccessor: model.idAccessor, // TODO(burdon): !!!
        }),
      ),
    [],
  );

  // Graph renderer.
  const renderer = useMemo(
    () =>
      new GraphRenderer(
        context,
        graphRef,
        defaulstDeep({}, slots?.renderer, {
          // idAccessor: model.idAccessor, // TODO(burdon): !!!
          transition: () => transition().duration(transitionDuration).ease(easeLinear),
          labels: {
            text: (node: GraphLayoutNode<N>) => node.id.slice(0, 8), // + `[${node.data.label}]`
          },
          arrows: { end: true },
          onNodeClick: (node: GraphLayoutNode<N>) => {
            onSelect?.(node.data!);
          },
        }),
      ),
    [],
  );

  // Subscribe to model.
  const [data, setData] = useState(model.graph);
  useEffect(() => {
    model.subscribe((graph) => {
      // TODO(burdon): !!!
      // setData({ ...graph });
      // setSelected(model.selected);
    });
  }, [model]);

  // Trigger layout.
  useEffect(() => {
    if (graphRef.current) {
      // TODO(burdon): !!!
      // projector.update(model.graph, model.selected);
      renderer.render(projector.layout);
    }
  }, [graphRef, data]);

  return (
    <g className={'*:fill-transparent *:stroke-[1px] *:stroke-slate-500'}>
      <g ref={graphRef} className={slots?.root?.className} />;
      <g
        className={mx(
          'visible',
          invisible && 'invisible',
          spin ? 'animate-[spin_2s] __animate-[ping_2s]' : 'animate-none', // TODO(burdon): Ping on start.
        )}
      >
        <Aperture
          x={-64}
          y={-64}
          width={128}
          height={128}
          className={mx('[&>rect]:stroke-0 *:stroke-2', slots?.thorax?.className)}
        />
      </g>
    </g>
  );
};
