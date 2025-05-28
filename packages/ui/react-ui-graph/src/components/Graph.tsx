//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { useEffect, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { type GraphModel } from '@dxos/graph';

import {
  createSimulationDrag,
  type AttributesOptions,
  GraphForceProjector,
  type GraphLayoutNode,
  GraphRenderer,
  type LabelOptions,
} from '../graph';
import { useSvgContext } from '../hooks';

import '../styles/graph.css';

export type GraphProps = {
  className?: string;
  model?: GraphModel;
  projector?: GraphForceProjector;
  delay?: number;
  drag?: boolean;
  arrows?: boolean;
  labels?: LabelOptions<any>;
  attributes?: AttributesOptions<any>;
  onSelect?: (node: GraphLayoutNode<any>) => void;
};

/**
 * SVG Graph controller.
 */
export const Graph = ({
  className = 'graph',
  model,
  projector: _projector,
  delay,
  drag,
  arrows,
  labels,
  attributes,
  onSelect,
}: GraphProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = _projector ?? new GraphForceProjector(context);
    const renderer = new GraphRenderer(context, graphRef, {
      drag: drag ? createSimulationDrag(context, projector.simulation) : undefined,
      arrows: {
        end: arrows,
      },
      labels,
      attributes,
      onNodeClick: onSelect ? (node: GraphLayoutNode<any>) => onSelect(node) : undefined,
    });

    return {
      projector,
      renderer,
    };
  }, [context, drag]);

  useEffect(() => {
    projector.update(model?.graph);

    let unsubscribe;
    const t = setTimeout(() => {
      // Delay rendering until projector has settled.
      unsubscribe = projector.updated.on(({ layout }) => renderer.update(layout));
    }, delay);

    return combine(
      effect(() => projector.update(model?.graph)),
      () => {
        clearTimeout(t);
        unsubscribe?.();
      },
    );
  }, [projector, renderer, model]);

  useEffect(() => {
    void projector.start();
    return () => {
      void projector.stop();
    };
  }, [projector]);

  return <g ref={graphRef} className={className} />;
};
