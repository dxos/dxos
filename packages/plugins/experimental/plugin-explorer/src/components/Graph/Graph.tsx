//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

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
          manyBody: {
            strength: -100,
          },
          link: {
            distance: 120,
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

  if (!model) {
    return null;
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
