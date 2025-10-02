//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { type JSX, type Ref, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { type BaseGraphEdge, type BaseGraphNode, type GraphModel } from '@dxos/graph';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import {
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphProjector,
  GraphRenderer,
  type GraphRendererOptions,
  createGraphDrag,
} from '../../graph';
import { useSvgContext } from '../../hooks';

export type GraphController = {
  refresh: () => void;
  repaint: () => void;
  findNode: (id: string) => SVGGElement | null;
};

export type GraphProps<Node extends BaseGraphNode = any, Edge extends BaseGraphEdge = any> = ThemedClassName<
  Pick<GraphRendererOptions<Node>, 'labels' | 'subgraphs' | 'attributes'> & {
    model?: GraphModel<Node, Edge>; // TODO(burdon): ReactiveGraphModel
    projector?: GraphProjector<Node>;
    renderer?: GraphRenderer<Node>;
    drag?: boolean;
    arrows?: boolean;
    onSelect?: (node: GraphLayoutNode<Node>, event: MouseEvent) => void;
    onInspect?: (node: GraphLayoutNode<Node>, event: MouseEvent) => void;
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
    onSelect,
    onInspect,
    ...props
  }: GraphProps<Node, Edge>,
  forwardedRef: Ref<GraphController>,
) => {
  const context = useSvgContext();
  const graphRef = useRef<SVGGElement>(null);

  const { projector, renderer } = useMemo(() => {
    let projector = _projector;
    if (!projector) {
      projector = new GraphForceProjector<Node>(context);
    }

    let renderer = _renderer;
    if (!renderer) {
      renderer = new GraphRenderer<Node>(context, graphRef, {
        ...props,
        // TODO(burdon): Replace drag when projector is updated.
        drag: drag ? createGraphDrag(context, projector) : undefined,
        arrows: { end: arrows },
        onNodeClick: onSelect ? (node: GraphLayoutNode, event) => onSelect(node, event) : undefined,
        onNodePointerEnter: onInspect ? (node: GraphLayoutNode, event) => onInspect(node, event) : undefined,
      });
    }

    return { projector, renderer };
  }, [context, _projector, _renderer, drag]);

  // External API.
  useImperativeHandle(
    forwardedRef,
    () => ({
      refresh: () => {
        projector.updateData(model?.graph);
      },
      repaint: () => {
        renderer.render(projector.layout);
      },
      findNode: (id: string) => {
        return graphRef.current?.querySelector<SVGGElement>(`g[data-id="${id}"]`);
      },
    }),
    [model, projector, renderer],
  );

  // Subscriptions.
  useEffect(() => {
    return combine(
      effect(() => {
        projector.updateData(model?.graph);
      }),
      projector.updated.on(({ layout }) => {
        try {
          renderer.render(layout);
        } catch (error) {
          void projector.stop();
          log.catch(error);
        }
      }),
    );
  }, [model, projector, renderer]);

  // Start.
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
