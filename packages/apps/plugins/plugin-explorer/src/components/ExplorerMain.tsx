//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type View as ViewType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, Markers } from '@dxos/gem-spore';
import { convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore/testing';
import { useClient } from '@dxos/react-client';
import { type PluginComponentProps } from '@dxos/react-surface';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

export const ExplorerMain = ({ data }: PluginComponentProps<ViewType>) => {
  const client = useClient();
  const space = client.spaces.default; // TODO(burdon): Get from data object.

  // TODO(burdon): Model; anchor on selected item.
  const { objects } = space.db.query();
  const model = useMemo(() => new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 }))), []);

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <SVGContextProvider>
        <SVG className={slots?.root?.className}>
          <Markers arrowSize={6} />
          <Grid className={slots?.grid?.className} />
          <Zoom extent={[1, 4]}>
            <Graph model={model} drag arrows />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </Main.Content>
  );
};
