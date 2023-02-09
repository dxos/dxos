//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph as GemGraph, Markers } from '@dxos/gem-spore';
import { convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore/testing';

export type GraphComponentProps = {
  data?: any;
};

export const GraphComponent = ({ data }: GraphComponentProps) => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

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
