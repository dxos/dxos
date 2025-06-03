//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { type GraphModel } from '@dxos/graph';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import {
  createDrag,
  GraphForceProjector,
  type GraphLayoutNode,
  GraphRenderer,
  type GraphRendererOptions,
} from '../../graph';
import { useSvgContext } from '../../hooks';

export type GraphController = {
  refresh: () => void;
};

export type GraphProps = ThemedClassName<
  Pick<GraphRendererOptions<any>, 'labels' | 'attributes' | 'subgraphs'> & {
    model?: GraphModel;
    projector?: GraphForceProjector;
    renderer?: GraphRenderer<any>;
    delay?: number;
    drag?: boolean;
    arrows?: boolean;
    onSelect?: (node: GraphLayoutNode<any>) => void;
  }
>;

/**
 * SVG Graph controller.
 */
export const Graph = forwardRef<GraphController, GraphProps>(
  (
    { classNames, model, projector: _projector, renderer: _renderer, delay, drag, arrows, onSelect, ...props },
    forwardedRef,
  ) => {
    const context = useSvgContext();
    const graphRef = useRef<SVGGElement>();

    const { projector, renderer } = useMemo(() => {
      const projector = _projector ?? new GraphForceProjector(context);
      const renderer =
        _renderer ??
        new GraphRenderer(context, graphRef, {
          ...props,
          drag: drag ? createDrag(context, projector.simulation) : undefined,
          arrows: { end: arrows },
          onNodeClick: onSelect ? (node: GraphLayoutNode) => onSelect(node) : undefined,
        });

      return {
        projector,
        renderer,
      };
    }, [context, _projector, _renderer, drag]);

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
        unsubscribe = projector.updated.on(({ layout }) => {
          try {
            renderer.update(layout);
          } catch (error) {
            log.catch(error);
            void projector.stop();
          }
        });
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
