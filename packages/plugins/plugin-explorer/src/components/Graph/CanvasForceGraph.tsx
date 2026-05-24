//
// Copyright 2023 DXOS.org
//

import { forceLink, forceManyBody } from 'd3';
import NativeForceGraph from 'force-graph';
import React, {
  type ComponentPropsWithoutRef,
  type Ref,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { composable, composableProps } from '@dxos/react-ui';
import { type SpaceGraphModel } from '@dxos/schema';

import { GraphAdapter } from './graph-adapter';

export type CanvasForceGraphProps = {
  model?: SpaceGraphModel;
  match?: RegExp;
};

/**
 * More performance optimized version of the ForceGraph.
 */
export const CanvasForceGraph = composable<HTMLDivElement, CanvasForceGraphProps>(
  ({ model, match, onClick, ...props }, forwardedRef) => {
    const { ref: resizeRef, width, height } = useResizeDetector({ refreshRate: 200 });
    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        resizeRef(node);
        assignRef(forwardedRef, node);
      },
      [resizeRef, forwardedRef],
    );

    const rootRef = useRef<HTMLDivElement>(null);
    const forceGraph = useRef<NativeForceGraph>(null);

    const [data, setData] = useState<GraphAdapter>();
    useEffect(() => {
      return model?.subscribe((model) => setData(new GraphAdapter(model.graph)));
    }, [model]);

    useEffect(() => {
      if (rootRef.current) {
        // https://github.com/vasturiano/force-graph
        // https://github.com/vasturiano/3d-force-graph
        forceGraph.current = new NativeForceGraph(rootRef.current)
          // https://github.com/vasturiano/force-graph?tab=readme-ov-file#node-styling
          .nodeRelSize(6)
          .nodeLabel((node: any) => (node.type === 'schema' ? node.data.typename : (node.data.label ?? node.id)))
          .nodeAutoColorBy((node: any) => (node.type === 'schema' ? 'schema' : node.data.typename))

          // https://github.com/vasturiano/force-graph?tab=readme-ov-file#link-styling
          .linkAutoColorBy((link: any) => link.type);
      }

      return () => {
        forceGraph.current?.pauseAnimation().graphData({ nodes: [], links: [] });
        forceGraph.current = null;
      };
    }, []);

    useEffect(() => {
      if (!data || !width || !height || !forceGraph.current) {
        return;
      }

      // https://github.com/vasturiano/force-graph?tab=readme-ov-file#container-layout
      forceGraph.current
        .pauseAnimation()
        .width(width)
        .height(height)
        .onEngineStop(() => handleZoomToFit())
        .onNodeClick((node: any) => {
          forceGraph.current?.emitParticle(node);
        })

        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#force-engine-d3-force-configuration
        // .d3Force('center', forceCenter().strength(0.9))
        .d3Force('link', forceLink().distance(160).strength(0.5))
        .d3Force('charge', forceManyBody().strength(-30))

        .graphData(data)
        .warmupTicks(100)
        .cooldownTime(1_000)
        .resumeAnimation();
    }, [data, width, height]);

    const handleZoomToFit = () => {
      forceGraph.current?.zoomToFit(400, 40);
    };

    const handleClick = useCallback<NonNullable<ComponentPropsWithoutRef<'div'>['onClick']>>(
      (event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          handleZoomToFit();
        }
      },
      [onClick],
    );

    return (
      <div {...composableProps(props, { classNames: 'relative grow' })} onClick={handleClick} ref={setRef}>
        <div ref={rootRef} className='absolute inset-0' />
      </div>
    );
  },
);

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null): void => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    (ref as RefObject<T | null>).current = value;
  }
};
