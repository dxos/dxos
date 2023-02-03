//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

// import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
// import { convertTreeToGraph, createTree, Graph as GemGraph, Markers, TestGraphModel } from '@dxos/gem-spore';

import { /* convertTreeToGraph, createTree, */ TestGraphModel } from '@dxos/gem-spore';

export type PlexusParam = {
  data?: object;
};

export const Plexus = ({ data }: PlexusParam) => {
  // const { database: db } = useSpace();
  // const projects = useObjects(Project.filter());
  const model = useMemo(
    () => new TestGraphModel(),
    // convertTreeToGraph(createTree({ depth: 4 }))
    []
  );

  console.log(data);

  return <div />;
  // return (
  // <SVGContextProvider>
  //   <SVG>
  //     <Markers />
  //     <Grid />
  //     <Zoom extent={[1, 4]}>
  //       <GemGraph model={model} drag arrows />
  //     </Zoom>
  //   </SVG>
  // </SVGContextProvider>
  // );
};
