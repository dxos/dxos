//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { type JSX, type Ref, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { type CleanupFn, combine, timeout } from '@dxos/async';
import { type BaseGraphEdge, type BaseGraphNode, type GraphModel } from '@dxos/graph';
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
  repaint: () => void;
};

export type GraphProps<Node extends BaseGraphNode = any, Edge extends BaseGraphEdge = any> = ThemedClassName<
  Pick<GraphRendererOptions<Node>, 'labels' | 'subgraphs' | 'attributes'> & {
    model?: GraphModel<Node, Edge>;
    projector?: GraphForceProjector<Node>;
    renderer?: GraphRenderer<Node>;
    drag?: boolean;
    arrows?: boolean;
    delay?: number;
    onSelect?: (node: GraphLayoutNode<Node>) => void;
  }
>;

export const GraphInner = <Node extends BaseGraphNode = any, Edge extends BaseGraphEdge = any>(
  {
    classNames,
    model,
    projector: _projector,
    renderer: _renderer,
    drag,
    arrows,
    delay,
    onSelect,
    ...props
  }: GraphProps<Node, Edge>,
  forwardedRef: Ref<GraphController>,
) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>();

  const { projector, renderer } = useMemo(() => {
    const projector = _projector ?? new GraphForceProjector<Node>(context);
    const renderer =
      _renderer ??
      new GraphRenderer<Node>(context, graphRef, {
        ...props,
        drag: drag ? createDrag(context, projector.simulation) : undefined,
        arrows: { end: arrows },
        onNodeClick: onSelect ? (node: GraphLayoutNode) => onSelect(node) : undefined,
      });

    return { projector, renderer };
  }, [context, _projector, _renderer, drag]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      refresh: () => {
        projector.update(model?.graph);
      },
      repaint: () => {
        renderer.update(projector.layout);
      },
    }),
    [projector, model],
  );

  useEffect(() => {
    let unsubscribe: CleanupFn | undefined;
    return combine(
      effect(() => {
        projector.update(model?.graph);
      }),
      timeout(() => {
        // Delay rendering until projector has settled.
        unsubscribe = projector.updated.on(({ layout }) => {
          try {
            renderer.update(layout);
          } catch (error) {
            void projector.stop();
            log.catch(error);
          }
        });
      }, delay),
      () => unsubscribe?.(),
    );
  }, [projector, renderer, model]);

  useEffect(() => {
    void projector.start();
    return () => {
      void projector.stop();
    };
  }, [projector]);

  return <g ref={graphRef} className={mx('dx-graph', classNames)} />;
};

/**
 * SVG Graph.
 */
export const Graph = forwardRef(GraphInner) as <Node extends BaseGraphNode = any, Edge extends BaseGraphEdge = any>(
  props: GraphProps<Node, Edge> & { ref?: Ref<GraphController> },
) => JSX.Element;
