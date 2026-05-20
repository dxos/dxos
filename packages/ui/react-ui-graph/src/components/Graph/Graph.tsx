//
// Copyright 2022 DXOS.org
//

import React, { type JSX, type Ref, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { combine } from '@dxos/async';
import { GraphModel, type Graph as Graph$ } from '@dxos/graph';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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

export type GraphProps<Node extends Graph$.Node.Any = any, Edge extends Graph$.Edge.Any = any> = ThemedClassName<
  Pick<GraphRendererOptions<Node>, 'labels' | 'subgraphs' | 'attributes' | 'renderNode'> & {
    model?: GraphModel.ReactiveGraphModel<Node, Edge>;
    projector?: GraphProjector<Node>;
    renderer?: GraphRenderer<Node>;
    drag?: boolean;
    arrows?: boolean;
    onSelect?: (node: GraphLayoutNode<Node>, event: MouseEvent) => void;
    onInspect?: (node: GraphLayoutNode<Node>, event: MouseEvent) => void;
  }
>;

const GraphInner = <Node extends Graph$.Node.Any = any, Edge extends Graph$.Edge.Any = any>(
  {
    classNames,
    model,
    projector: projectorProp,
    renderer: rendererProp,
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
    let projector = projectorProp;
    if (!projector) {
      projector = new GraphForceProjector<Node>(context);
    }

    let renderer = rendererProp;
    if (!renderer) {
      renderer = new GraphRenderer<Node>(context, graphRef, {
        ...props,
        // TODO(burdon): Replace drag when projector is updated.
        drag: drag ? createGraphDrag(context, projector) : undefined,
        arrows: { end: arrows },
        onNodeClick: onSelect,
        onNodePointerEnter: onInspect,
      });
    }

    return { projector, renderer };
  }, [context, projectorProp, rendererProp, drag]);

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
    // Wire the renderer listener BEFORE calling updateData so the synchronous
    // 'topology' emit (fired from inside onUpdate) reaches the renderer.
    const cleanup = combine(
      // Subscribe to model changes if reactive model.
      model
        ? model.subscribe(() => {
            projector.updateData(model?.graph);
          })
        : undefined,

      projector.updated.on(({ layout, kind }) => {
        try {
          // 'positions' is the per-tick fast path; 'topology' (and unset, for back-compat) is the full render.
          if (kind === 'positions') {
            renderer.applyPositions(layout);
          } else {
            renderer.render(layout);
          }
        } catch (error) {
          log.catch(error);
          void projector.stop();
        }
      }),
    );

    projector.updateData(model?.graph);

    return cleanup;
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
export const Graph = forwardRef(GraphInner) as <Node extends Graph$.Node.Any = any, Edge extends Graph$.Edge.Any = any>(
  props: GraphProps<Node, Edge> & { ref?: Ref<GraphController> },
) => JSX.Element;
