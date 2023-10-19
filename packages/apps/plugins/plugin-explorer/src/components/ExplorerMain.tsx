//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type View as ViewType } from '@braneframe/types';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, Markers } from '@dxos/gem-spore';
import { convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore/testing';
import { useClient } from '@dxos/react-client';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

// TODO(burdon): Surface type.
export type ExplorerMainParams = { data?: ViewType };

export const ExplorerMain = ({ data }: ExplorerMainParams) => {
  const client = useClient();
  const space = client.spaces.default; // TODO(burdon): Get from data object.

  // TODO(burdon): Model.
  const { objects } = space.db.query();
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <SVGContextProvider>
      <SVG className={slots?.root?.className}>
        <Markers arrowSize={6} />
        <Grid className={slots?.grid?.className} />
        <Zoom extent={[1, 4]}>
          <Graph model={model} drag arrows />
        </Zoom>
      </SVG>
    </SVGContextProvider>
  );
};
