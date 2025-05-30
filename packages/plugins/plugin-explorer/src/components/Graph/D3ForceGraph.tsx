//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { SelectionModel } from '@dxos/graph';
import {
  Graph as GraphComponent,
  GraphForceProjector,
  type GraphLayoutNode,
  Grid,
  Markers,
  SVG,
  SVGRoot,
  Zoom,
  createSvgContext,
} from '@dxos/react-ui-graph';

import { SpaceGraphModel } from './model';

import '@dxos/react-ui-graph/styles/graph.css';

export type D3ForceGraphProps = {
  space: Space;
  match?: RegExp;
};

export const D3ForceGraph: FC<D3ForceGraphProps> = ({ space, match }) => {
  const model = useMemo(() => new SpaceGraphModel(), [space]);
  const selected = useMemo(() => new SelectionModel(), []);
  const context = createSvgContext();
  const projector = useMemo(() => new GraphForceProjector(context), []);

  useEffect(() => {
    void model.open(space);
  }, [space, model]);

  return (
    <SVGRoot context={context}>
      <SVG classNames='graph'>
        <Markers />
        <Grid axis />
        <Zoom extent={[1 / 2, 2]}>
          <GraphComponent
            drag
            model={model}
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode) => node.data.label,
            }}
            attributes={{
              node: (node: GraphLayoutNode) => ({
                class: selected.contains(node.id) ? 'selected' : undefined,
              }),
            }}
            onSelect={(node: GraphLayoutNode) => {
              if (selected.contains(node.id)) {
                selected.remove(node.id);
              } else {
                selected.contains(node.id);
              }
            }}
          />
        </Zoom>
      </SVG>
    </SVGRoot>
  );
};
