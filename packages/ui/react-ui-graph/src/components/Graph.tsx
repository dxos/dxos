//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { useEffect, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { type GraphModel } from '@dxos/graph';
import { useSvgContext } from '@dxos/react-ui-graph';

import { defaultStyles } from './styles';
import {
  createSimulationDrag,
  type AttributesOptions,
  GraphForceProjector,
  type GraphLayoutNode,
  GraphRenderer,
  type LabelOptions,
} from '../graph';

export type GraphProps = {
  className?: string;
  model?: GraphModel;
  projector?: GraphForceProjector;
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
  className = defaultStyles,
  model,
  projector: controlledProjector,
  drag,
  arrows,
  labels,
  attributes,
  onSelect,
}: GraphProps) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = controlledProjector ?? new GraphForceProjector(context);
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
  }, []);

  useEffect(() => {
    projector.update(model?.graph);
    return combine(
      projector.updated.on(({ layout }) => renderer.update(layout)),
      effect(() => {
        projector.update(model?.graph);
      }),
    );
  }, [model]);

  useEffect(() => {
    void projector.start();
    return () => {
      void projector.stop();
    };
  }, []);

  return <g ref={graphRef} className={className} />;
};
