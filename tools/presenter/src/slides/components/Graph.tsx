//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

// import { Client } from '@dxos/client';
import { SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph as GemGraph, Markers } from '@dxos/gem-spore';
import { convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore/testing';

// console.log(Client);
export const Graph = () => {
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG>
        <Markers />
        <Zoom extent={[2, 4]}>
          <GemGraph model={model} drag arrows />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
