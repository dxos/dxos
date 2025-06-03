//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { type GraphModel } from '@dxos/graph';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import {
  createDrag,
  type AttributesOptions,
  GraphForceProjector,
  type GraphLayoutNode,
  GraphRenderer,
  type LabelOptions,
} from '../../graph';
import { useSvgContext } from '../../hooks';

export type GraphController = {
  refresh: () => void;
};

export type GraphProps = ThemedClassName<{
  model?: GraphModel;
  projector?: GraphForceProjector;
  delay?: number;
  drag?: boolean;
  arrows?: boolean;
  labels?: LabelOptions<any>;
  attributes?: AttributesOptions<any>;
  onSelect?: (node: GraphLayoutNode<any>) => void;
}>;

/**
 * SVG Graph controller.
 */
export const Graph = forwardRef<GraphController, GraphProps>(
  ({ classNames, model, projector: _projector, delay, drag, arrows, labels, attributes, onSelect }, forwardedRef) => {
    const context = useSvgContext();
    const graphRef = useRef<SVGGElement>();

    const { projector, renderer } = useMemo(() => {
      const projector = _projector ?? new GraphForceProjector(context);
      const renderer = new GraphRenderer(context, graphRef, {
        drag: drag ? createDrag(context, projector.simulation) : undefined,
        arrows: { end: arrows },
        labels,
        attributes,
        onNodeClick: onSelect ? (node: GraphLayoutNode<any>) => onSelect(node) : undefined,
      });

      return {
        projector,
        renderer,
      };
    }, [context, _projector, drag]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        refresh: () => {
          renderer.update(projector.layout);
        },
      }),
      [projector, model],
    );

    useEffect(() => {
      projector.update(model?.graph);

      let unsubscribe: (() => void) | undefined;
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

    return <g ref={graphRef} className={mx('dx-graph', classNames)} />;
  },
);
