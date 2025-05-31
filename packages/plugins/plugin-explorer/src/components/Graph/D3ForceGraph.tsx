//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useMemo, useRef } from 'react';

import { type Space } from '@dxos/client/echo';
import { SelectionModel } from '@dxos/graph';
import { GraphForceProjector, type GraphLayoutNode, SVG, type SVGContext } from '@dxos/react-ui-graph';

import { SpaceGraphModel } from './model';

import '@dxos/react-ui-graph/styles/graph.css';

export type D3ForceGraphProps = {
  space: Space;
  match?: RegExp;
};

export const D3ForceGraph: FC<D3ForceGraphProps> = ({ space, match }) => {
  const model = useMemo(() => new SpaceGraphModel(), [space]);
  const selected = useMemo(() => new SelectionModel(), []);
  const context = useRef<SVGContext>(null);
  const projector = useMemo<GraphForceProjector | undefined>(
    () => (context.current ? new GraphForceProjector(context.current) : undefined),
    [context],
  );

  useEffect(() => {
    void model.open(space);
  }, [space, model]);

  return (
    <SVG.Root ref={context}>
      <SVG.Markers />
      <SVG.Grid axis />
      <SVG.Zoom extent={[1 / 2, 2]}>
        <SVG.Graph
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
      </SVG.Zoom>
    </SVG.Root>
  );
};
