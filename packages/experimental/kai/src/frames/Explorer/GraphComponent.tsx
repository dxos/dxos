//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph as GemGraph, GraphModel, Markers } from '@dxos/gem-spore';

export type GraphComponentProps<N> = {
  model: GraphModel<N>;
};

export const GraphComponent = <N,>({ model }: GraphComponentProps<N>) => {
  // TODO(burdon): Share parent SVG.
  // TODO(burdon): Flickers initially.
  return (
    <SVGContextProvider>
      <SVG>
        <Markers />
        <Grid />
        <Zoom extent={[1, 4]}>
          <GemGraph model={model} drag arrows />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
