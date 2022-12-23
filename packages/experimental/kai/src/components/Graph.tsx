//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { convertTreeToGraph, createTree, Graph as GemGraph, Markers, TestGraphModel } from '@dxos/gem-spore';

export const Graph = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG>
        <Markers />
        <Zoom extent={[1, 4]}>
          <GemGraph model={model} drag arrows />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
