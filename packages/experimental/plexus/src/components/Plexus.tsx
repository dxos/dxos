//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph as GemGraph, Markers, convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore';

export type PlexusParam = {
  data?: object;
};

export const Plexus = ({ data }: PlexusParam) => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  console.log(data);

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
