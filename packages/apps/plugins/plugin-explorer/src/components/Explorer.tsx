//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type Space, type TypedObject } from '@dxos/client/echo';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, type GraphLayoutNode, Markers } from '@dxos/gem-spore';

import { EchoGraphModel } from './graph-model';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

export const Explorer: FC<{ space: Space }> = ({ space }) => {
  const model = useMemo(() => (space ? new EchoGraphModel().open(space) : undefined), [space]);

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
                return node.data?.label ?? node.data?.title ?? node.data?.name;
              },
            }}
          />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
