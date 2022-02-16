//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import {
  createSimulationDrag,
  defaultForceOptions,
  AttributesOptions,
  ForceOptions,
  GraphForceProjector,
  GraphModel,
  GraphLayoutNode,
  GraphRenderer,
  LabelOptions,
} from '../graph';
import { defaultGraphStyles } from './styles';

import { useSvgContext } from '@dxos/gem-core';

export interface GraphProps {
  className?: string
  forces?: ForceOptions
  arrows?: boolean
  drag?: boolean
  model?: GraphModel<any>
  labels?: LabelOptions<any>
  attributes?: AttributesOptions<any>
  onSelect?: (node: GraphLayoutNode<any>) => void
}

/**
 * SVG Graph controller.
 * @param className
 * @param forces
 * @param arrows
 * @param drag
 * @param model
 * @param labels
 * @param attributes
 * @param onSelect
 * @constructor
 */
export const Graph = ({
  className = defaultGraphStyles,
  forces = defaultForceOptions,
  arrows,
  drag,
  model,
  labels,
  attributes,
  onSelect
}: GraphProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = new GraphForceProjector(context, { forces });
    const renderer = new GraphRenderer(context, graphRef, {
      drag: drag ? createSimulationDrag(context, projector.simulation) : undefined,
      arrows: {
        end: arrows
      },
      labels,
      attributes,
      onNodeClick: onSelect ? (node: GraphLayoutNode<any>) => onSelect(node) : undefined
    });

    return {
      projector,
      renderer
    };
  }, []);

  useEffect(() => {
    projector.updated.on(({ layout }) => {
      renderer.update(layout);
    });

    projector.update(model?.graph);
    return model?.subscribe(graph => {
      projector.update(graph);
    })
  }, []);

  useEffect(() => {
    void projector.start();
    return () => void projector.stop();
  }, []);

  return (
    <g ref={graphRef} className={className} />
  );
}
