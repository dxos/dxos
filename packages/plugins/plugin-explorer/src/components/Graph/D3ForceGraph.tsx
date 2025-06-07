//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo, useRef } from 'react';

import { SelectionModel } from '@dxos/graph';
import { type ThemedClassName } from '@dxos/react-ui';
import { GraphForceProjector, SVG, type SVGContext } from '@dxos/react-ui-graph';
import { type SpaceGraphNode, type SpaceGraphModel, type SpaceGraphEdge } from '@dxos/schema';

import '@dxos/react-ui-graph/styles/graph.css';

export type D3ForceGraphProps = ThemedClassName<{
  model?: SpaceGraphModel;
  match?: RegExp;
  selection?: SelectionModel;
}>;

export const D3ForceGraph: FC<D3ForceGraphProps> = ({ classNames, model, selection: _selection }) => {
  const selected = useMemo(() => _selection ?? new SelectionModel(), [_selection]);
  const context = useRef<SVGContext>(null);
  const projector = useMemo<GraphForceProjector | undefined>(
    () => (context.current ? new GraphForceProjector(context.current) : undefined),
    [context],
  );

  return (
    <SVG.Root ref={context} classNames={classNames}>
      <SVG.Markers />
      <SVG.Grid axis />
      <SVG.Zoom extent={[1 / 2, 2]}>
        <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
          drag
          model={model}
          projector={projector}
          labels={{
            text: (node) => {
              return node.data?.data.label ?? node.id;
            },
          }}
          // TODO(burdon): Fix classes.
          // attributes={{
          //   node: (node) => ({
          //     class: selected.contains(node.id) ? 'selected' : undefined,
          //   }),
          // }}
          onSelect={(node) => {
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
