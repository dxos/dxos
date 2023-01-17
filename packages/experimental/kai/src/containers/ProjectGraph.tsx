//
// Copyright 2022 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { convertTreeToGraph, createTree, Graph as GemGraph, Markers, TestGraphModel } from '@dxos/gem-spore';

// import { useObjects, useSpace } from '../hooks';
// import { Project } from '../proto';

// class Model implements GraphModel<> {}

export const ProjectGraph: FC = () => {
  // const { database: db } = useSpace();
  // const projects = useObjects(Project.filter());
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
