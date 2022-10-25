//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { useSvgContext } from '@dxos/gem-core';

import {
  createSimulationDrag,
  AttributesOptions,
  GraphForceProjector,
  GraphModel,
  GraphLayoutNode,
  GraphRenderer,
  LabelOptions
} from '../graph';
import { defaultGraphStyles } from './styles';

export interface GraphProps {
  className?: string;
  model?: GraphModel<any>;
  projector?: GraphForceProjector<any>;
  drag?: boolean;
  arrows?: boolean;
  labels?: LabelOptions<any>;
  attributes?: AttributesOptions<any>;
  onSelect?: (node: GraphLayoutNode<any>) => void;
}

/**
 * SVG Graph controller.
 * @constructor
 */
export const Graph = ({
  className = defaultGraphStyles,
  model,
  projector: controlledProjector,
  drag,
  arrows,
  labels,
  attributes,
  onSelect
}: GraphProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = controlledProjector ?? new GraphForceProjector(context);
    const renderer = new GraphRenderer(context, graphRef, {
      drag: drag
        ? createSimulationDrag(context, projector.simulation)
        : undefined,
      arrows: {
        end: arrows
      },
      labels,
      attributes,
      onNodeClick: onSelect
        ? (node: GraphLayoutNode<any>) => onSelect(node)
        : undefined
    });

    return {
      projector,
      renderer
    };
  }, []);

  useEffect(() => {
    const subscribeProjector = projector.updated.on(({ layout }) =>
      renderer.update(layout)
    );
    const subscribeModel = model?.subscribe((graph) => projector.update(graph));
    projector.update(model?.graph);

    return () => {
      subscribeProjector();
      subscribeModel?.();
    };
  }, [model]);

  useEffect(() => {
    void projector.start();
    return () => {
      void projector.stop();
    };
  }, []);

  return <g ref={graphRef} className={className} />;
};
