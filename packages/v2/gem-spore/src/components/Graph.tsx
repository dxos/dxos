//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { createSimulationDrag, GraphForceProjector, GraphModel, GraphNode, GraphRenderer } from '../graph';
import { defaultGraphStyles } from './styles';

import { useSvgContext } from '@dxos/gem-core';

export interface GraphProps {
  model?: GraphModel<any>
  className?: string
  drag?: boolean
  arrows?: boolean
  label?: (node: GraphNode<any>) => string
  nodeClass?: (node: GraphNode<any>) => string
  onSelect?: (node: any) => void
}

/**
 * SVG Graph controller.
 * @param model
 * @param className
 * @param drag
 * @param arrows
 * @param label
 * @param nodeClass
 * @param onSelect
 * @constructor
 */
export const Graph = ({
  model,
  className = defaultGraphStyles,
  drag,
  arrows,
  label,
  nodeClass,
  onSelect
}: GraphProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = new GraphForceProjector(context);
    const renderer = new GraphRenderer(context, graphRef, {
      drag: drag ? createSimulationDrag(context, projector.simulation) : undefined,
      arrows: {
        end: arrows
      },
      label,
      nodeClass,
      onNodeClick: (node: GraphNode<any>) => onSelect(node)
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

    projector.update(model.graph);
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
