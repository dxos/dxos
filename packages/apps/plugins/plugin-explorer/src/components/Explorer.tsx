//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { type Schema, type Space, type TypedObject } from '@dxos/client/echo';
import { createSvgContext, Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, GraphForceProjector, type GraphLayoutNode, Markers } from '@dxos/gem-spore';

import { EchoGraphModel } from './graph-model';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

const colors = [
  '[&>circle]:!fill-slate-300',
  '[&>circle]:!fill-orange-300',
  '[&>circle]:!fill-green-300',
  '[&>circle]:!fill-teal-300',
  '[&>circle]:!fill-cyan-300',
  '[&>circle]:!fill-sky-300',
  '[&>circle]:!fill-green-300',
  '[&>circle]:!fill-indigo-300',
  '[&>circle]:!fill-purple-300',
  '[&>circle]:!fill-rose-300',
];

export const Explorer: FC<{ space: Space }> = ({ space }) => {
  const model = useMemo(() => (space ? new EchoGraphModel().open(space) : undefined), [space]);
  const [colorMap] = useState(new Map<Schema, string>());
  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector<TypedObject>(context, {
        forces: {
          manyBody: {
            strength: -100,
          },
          link: {
            distance: 200,
          },
          radial: {
            radius: 200,
            strength: 0.2,
          },
        },
        attributes: {
          radius: (node: GraphLayoutNode<TypedObject>) => 12,
        },
      }),
    [],
  );

  return (
    <SVGContextProvider context={context}>
      <SVG className={slots?.root?.className}>
        <Markers arrowSize={6} />
        <Grid className={slots?.grid?.className} />
        <Zoom extent={[1, 4]}>
          <Graph
            model={model}
            drag
            arrows
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode<TypedObject>) => {
                // TODO(burdon): Use schema.
                return node.data?.label ?? node.data?.title ?? node.data?.name ?? node.data?.id.slice(0, 8);
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<TypedObject>) => {
                let className: string | undefined;
                const schema = node.data?.__schema;
                if (schema) {
                  className = colorMap.get(schema);
                  if (!className) {
                    className = colors[colorMap.size % colors.length];
                    colorMap.set(schema, className);
                  }
                }

                return {
                  class: className,
                };
              },
            }}
          />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
