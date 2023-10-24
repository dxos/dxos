//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { type Schema, type Space, type TypedObject } from '@dxos/client/echo';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, type GraphLayoutNode, Markers } from '@dxos/gem-spore';

import { EchoGraphModel } from './graph-model';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

const colors = [
  '[&>circle]:!fill-red-300',
  '[&>circle]:!fill-green-300',
  '[&>circle]:!fill-blue-300',
  '[&>circle]:!fill-orange-300',
  '[&>circle]:!fill-purple-300',
];

export const Explorer: FC<{ space: Space }> = ({ space }) => {
  const model = useMemo(() => (space ? new EchoGraphModel().open(space) : undefined), [space]);
  const [colorMap] = useState(new Map<Schema, string>());

  return (
    <SVGContextProvider>
      <SVG className={slots?.root?.className}>
        <Markers arrowSize={6} />
        <Grid className={slots?.grid?.className} />
        <Zoom extent={[1, 4]}>
          <Graph
            model={model}
            drag
            arrows
            labels={{
              text: (node: GraphLayoutNode<TypedObject>) => {
                // TODO(burdon): Use schema.
                return node.data?.label ?? node.data?.title ?? node.data?.name ?? node.data?.id.slice(0, 8);
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<TypedObject>) => {
                let className: string | undefined;
                if (node.data?.__schema) {
                  className = colorMap.get(node.data.__schema);
                  if (!className) {
                    className = colors[colorMap.size % colors.length];
                    colorMap.set(node.data.__schema, className);
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
