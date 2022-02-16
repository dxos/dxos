//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import {
  createSimulationDrag,
  ClassesOptions,
  ForceOptions,
  GraphForceProjector,
  GraphModel,
  GraphLayoutNode,
  GraphRenderer,
  LabelOptions, defaultForceOptions,
} from '../graph';
import { defaultGraphStyles } from './styles';

import { useSvgContext } from '@dxos/gem-core';

export interface GraphProps {
  className?: string
  arrows?: boolean
  forces?: ForceOptions
  drag?: boolean
  model?: GraphModel<any>
  labels?: LabelOptions<any>
  classes?: ClassesOptions<any>
  onSelect?: (node: any) => void
}

/**
 * SVG Graph controller.
 * @param className
 * @param arrows
 * @param forces
 * @param drag
 * @param model
 * @param labels
 * @param classes
 * @param onSelect
 * @constructor
 */
export const Graph = ({
  className = defaultGraphStyles,
  arrows,
  forces = defaultForceOptions,
  drag,
  model,
  labels,
  classes,
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
      classes,
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
