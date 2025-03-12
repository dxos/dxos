//
// Copyright 2023 DXOS.org
//

import { forceCenter } from 'd3';
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
import { useThemeContext } from '@dxos/react-ui';
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
};

export const Graph: FC<GraphProps> = ({ space, match, grid }) => {
  const model = useMemo(() => (space ? new SpaceGraphModel({ schema: true }).open(space) : undefined), [space]);
  const [selected, setSelected] = useState<string>();
  const { themeMode } = useThemeContext();

  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector<EchoGraphNode>(context, {
        forces: {
          center: {
            // strength: 0.1,
          },
          manyBody: {
            strength: -100,
          },
          link: {
            distance: 120,
          },
          radial: {
            radius: 150,
            strength: 0.1,
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

  if (!model) {
    return null;
  }

  if (selected) {
    return <Tree space={space} selected={selected} variant='tidy' onNodeClick={() => setSelected(undefined)} />;
  }

  // https://github.com/vasturiano/force-graph
  const { ref, width, height } = useResizeDetector();
  const rootRef = useRef<HTMLDivElement>(null);
  const forceGraph = useRef<ForceGraph>();
  useEffect(() => {
    if (rootRef.current && width && height) {
      if (!forceGraph.current) {
        forceGraph.current = new ForceGraph(rootRef.current)
          .width(width)
          .height(height)

          // .dagMode('td')
          // .dagLevelDistance(300)
          .backgroundColor('#101020')
          .linkColor(() => 'rgba(255,255,255,0.2)')
          // .nodeRelSize(NODE_REL_SIZE)
          // .nodeId('path')
          // .nodeVal((node) => 100 / (node.level + 1))
          // .nodeLabel('id')
          // .nodeAutoColorBy('module')
          .linkDirectionalParticles(2)
          .linkDirectionalParticleWidth(2)
          // .d3Force(
          // 'collision',
          // forceCollide((node) => Math.sqrt(100 / (node.level + 1)) * NODE_REL_SIZE),
          // )
          .d3VelocityDecay(0.3)

          // https://d3js.org/d3-force/center
          .d3Force('center', forceCenter().strength(0.03))
          // .onEngineStop(() => forceGraph.current?.zoomToFit(400, 40));
          .graphData(model.graph);
      } else {
        forceGraph.current.width(width).height(height);
      }
    }

    return () => {
      forceGraph.current?.graphData({ nodes: [], links: [] });
      forceGraph.current = undefined;
    };
  }, [width, height]);

  return (
    <div ref={ref} className='relative grow'>
      <div ref={rootRef} className='absolute inset-0' />
    </div>
  );

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
