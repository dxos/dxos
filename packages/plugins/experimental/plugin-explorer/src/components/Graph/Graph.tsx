//
// Copyright 2023 DXOS.org
//

import { forceLink, forceManyBody } from 'd3';
import ForceGraph from 'force-graph';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { getTypename, type ReactiveEchoObject, type Space } from '@dxos/client/echo';
import { createSvgContext, defaultGridStyles, Grid, SVG, SVGRoot, Zoom } from '@dxos/gem-core';
import {
  defaultStyles,
  Graph as GraphComponent,
  GraphForceProjector,
  type GraphLayoutNode,
  Markers,
} from '@dxos/gem-spore';
import { filterObjectsSync, type SearchResult } from '@dxos/plugin-search';
import { useAsyncState, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import '@dxos/gem-spore/styles';

import { type EchoGraphNode, SpaceGraphModel } from './graph-model';
import { Tree } from '../Tree';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

const colors = [
  '[&>circle]:!fill-black-300   [&>circle]:!stroke-black-600',
  '[&>circle]:!fill-slate-300   [&>circle]:!stroke-slate-600',
  '[&>circle]:!fill-green-300   [&>circle]:!stroke-green-600',
  '[&>circle]:!fill-sky-300     [&>circle]:!stroke-sky-600',
  '[&>circle]:!fill-cyan-300    [&>circle]:!stroke-cyan-600',
  '[&>circle]:!fill-rose-300    [&>circle]:!stroke-rose-600',
  '[&>circle]:!fill-purple-300  [&>circle]:!stroke-purple-600',
  '[&>circle]:!fill-orange-300  [&>circle]:!stroke-orange-600',
  '[&>circle]:!fill-teal-300    [&>circle]:!stroke-teal-600',
  '[&>circle]:!fill-indigo-300  [&>circle]:!stroke-indigo-600',
];

export type GraphProps = {
  space: Space;
  match?: RegExp;
  grid?: boolean;
  svg?: boolean;
};

export const Graph: FC<GraphProps> = ({ space, match, grid, svg }) => {
  const { themeMode } = useThemeContext();
  const [selected, setSelected] = useState<string>();

  const [model] = useAsyncState(
    async () => (space ? new SpaceGraphModel({ schema: true }).open(space) : undefined),
    [space],
  );

  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector<EchoGraphNode>(context, {
        forces: {
          manyBody: {
            strength: -100,
          },
          link: {
            distance: 100,
          },
          radial: {
            radius: 150,
            strength: 0.05,
          },
        },
        attributes: {
          radius: (node: GraphLayoutNode<EchoGraphNode>) => (node.data?.type === 'schema' ? 12 : 8),
        },
      }),
    [],
  );

  const filteredRef = useRef<SearchResult[]>();
  filteredRef.current = filterObjectsSync(model?.objects ?? [], match);
  useEffect(() => {
    void projector.start();
  }, [match]);

  const [colorMap] = useState(new Map<string, string>());

  // https://github.com/vasturiano/force-graph
  const { ref, width, height } = useResizeDetector();
  const rootRef = useRef<HTMLDivElement>(null);
  const forceGraph = useRef<ForceGraph>();

  useEffect(() => {
    if (rootRef.current) {
      forceGraph.current = new ForceGraph(rootRef.current)
        .nodeRelSize(6)
        .nodeLabel((node: any) => {
          if (node.type === 'schema') {
            return node.data.typename;
          }

          return node.id;
        })
        .nodeAutoColorBy((node: any) => (node.type === 'schema' ? 'schema' : node.data.typename))
        .linkColor(() => 'rgba(255,255,255,0.25)');
    }

    return () => {
      forceGraph.current?.pauseAnimation().graphData({ nodes: [], links: [] });
      forceGraph.current = undefined;
    };
  }, []);

  // Update.
  useEffect(() => {
    if (forceGraph.current && width && height && model) {
      forceGraph.current
        .pauseAnimation()
        .width(width)
        .height(height)
        .onEngineStop(() => {
          forceGraph.current?.zoomToFit(400, 40);
        })

        // https://github.com/vasturiano/force-graph?tab=readme-ov-file#force-engine-d3-force-configuration
        // .d3Force('center', forceCenter().strength(0.9))
        .d3Force('link', forceLink().distance(160).strength(0.5))
        .d3Force('charge', forceManyBody().strength(-30))
        // .d3AlphaDecay(0.0228)
        // .d3VelocityDecay(0.4)
        .warmupTicks(100)
        // .cooldownTime(1000)

        //
        .graphData(model.graph)
        .resumeAnimation();
    }
  }, [model, width, height]);

  const handleZoomToFit = () => {
    forceGraph.current?.zoomToFit(400, 40);
  };

  if (!svg) {
    return (
      <div ref={ref} className='relative grow' onClick={handleZoomToFit}>
        <div ref={rootRef} className='absolute inset-0' />
      </div>
    );
  }

  if (selected) {
    return <Tree space={space} selected={selected} variant='tidy' onNodeClick={() => setSelected(undefined)} />;
  }

  return (
    <SVGRoot context={context}>
      <SVG className={mx(defaultStyles, slots?.root?.className)}>
        <Markers arrowSize={6} />
        {grid && <Grid className={slots?.grid?.className ?? defaultGridStyles(themeMode)} />}
        <Zoom extent={[1 / 2, 4]}>
          <GraphComponent
            model={model}
            projector={projector}
            drag
            arrows
            onSelect={(node) => setSelected(node?.data?.id)}
            labels={{
              text: (node: GraphLayoutNode<ReactiveEchoObject<any>>) => {
                if (filteredRef.current?.length && !filteredRef.current.some((object) => object.id === node.data?.id)) {
                  return undefined;
                }

                // TODO(burdon): Use schema.
                return node.data?.label ?? node.data?.title ?? node.data?.name ?? node.data?.id.slice(0, 8);
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<ReactiveEchoObject<any>>) => {
                let className: string | undefined;
                if (node.data) {
                  const { object } = node.data;
                  if (object) {
                    const typename = getTypename(object);
                    if (typename) {
                      className = colorMap.get(typename);
                      if (!className) {
                        className = colors[colorMap.size % colors.length];
                        colorMap.set(typename, className);
                      }
                    }
                  }
                }

                const selected = filteredRef.current?.some((object) => object.id === node.data?.id);
                const blur = !selected && !!filteredRef.current?.length;
                return {
                  class: mx(className, blur && 'opacity-70'),
                };
              },
              link: () => ({
                class: '[&>path]:!stroke-neutral-300 dark:[&>path]:!stroke-neutral-700',
              }),
            }}
          />
        </Zoom>
      </SVG>
    </SVGRoot>
  );
};
