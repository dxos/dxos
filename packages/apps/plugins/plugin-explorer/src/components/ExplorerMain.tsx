//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type View as ViewType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, type GraphData, GraphModel, Markers } from '@dxos/gem-spore';
import { convertTreeToGraph, createTree, TestGraphModel, type TestNode } from '@dxos/gem-spore/testing';
import { useClient } from '@dxos/react-client';
import { type PluginComponentProps } from '@dxos/react-surface';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

export const ExplorerMain = ({ data }: PluginComponentProps<ViewType>) => {
  const client = useClient();
  const space = client.spaces.default; // TODO(burdon): Get from data object.
  const model = useMemo(() => new EchoGraphModel(space), [space]);

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

export class EchoGraphModel extends GraphModel<TestNode> {
  private _model = new TestGraphModel(convertTreeToGraph(createTree({ depth: 4 })));

  constructor(private readonly _space: Space) {
    super();
  }

  override get graph(): GraphData<TestNode> {
    return this._model.graph;
  }
}
