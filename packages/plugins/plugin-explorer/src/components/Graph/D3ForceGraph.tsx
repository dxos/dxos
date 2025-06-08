//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useRef } from 'react';

import { SelectionModel } from '@dxos/graph';
import { GraphForceProjector, type GraphLayoutNode, SVG, type SVGContext } from '@dxos/react-ui-graph';
import { type SpaceGraphModel } from '@dxos/schema';

import '@dxos/react-ui-graph/styles/graph.css';

export type D3ForceGraphProps = {
  model: SpaceGraphModel;
  match?: RegExp;
};

export const D3ForceGraph: FC<D3ForceGraphProps> = ({ model }) => {
  const selected = useMemo(() => new SelectionModel(), []);
  const context = useRef<SVGContext>(null);
  const projector = useMemo<GraphForceProjector | undefined>(
    () => (context.current ? new GraphForceProjector(context.current) : undefined),
    [context],
  );

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
          // TODO(burdon): Fix classes.
          // attributes={{
          //   node: (node: GraphLayoutNode) => ({
          //     class: selected.contains(node.id) ? 'selected' : undefined,
          //   }),
          // }}
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
