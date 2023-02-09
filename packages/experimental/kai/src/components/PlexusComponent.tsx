//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { convertTreeToGraph, createTree, Markers, TestGraphModel, TestNode } from '@dxos/gem-spore';
import { Plexus } from '@dxos/plexus';

const slots = {};

// TODO(burdon): Merge with Graph (shared SVG).
export const PlexusComponent = () => {
  const model = useMemo(() => {
    const root = createTree({ depth: 5, children: 4 });
    const model = new TestGraphModel(convertTreeToGraph(root));
    model.setSelected(root.id);
    return model;
  }, []);

  const handleSelect = (node: TestNode) => {
    model.setSelected(node.id);
  };

  return (
    <SVGContextProvider>
      <SVG className={slots?.root}>
        <Markers arrowSize={6} />
        <Grid className={slots?.grid?.className} />
        <Zoom extent={[1, 4]}>
          <Plexus model={model} slots={slots?.plexus} onSelect={handleSelect} />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
