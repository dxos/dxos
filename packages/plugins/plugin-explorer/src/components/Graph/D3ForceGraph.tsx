//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { SelectionModel } from '@dxos/graph';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type GraphController,
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphProps,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { getHashColor } from '@dxos/react-ui-theme';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import '@dxos/react-ui-graph/styles/graph.css';

export type D3ForceGraphProps = ThemedClassName<
  {
    model?: SpaceGraphModel;
    match?: RegExp;
    selection?: SelectionModel;
    grid?: boolean;
  } & Pick<GraphProps, 'drag'>
>;

export const D3ForceGraph = ({ classNames, model, selection: _selection, grid, ...props }: D3ForceGraphProps) => {
  const context = useRef<SVGContext>(null);
  const projector = useMemo<GraphForceProjector | undefined>(() => {
    if (context.current) {
      return new GraphForceProjector(context.current, {
        attributes: {
          linkForce: (edge) => {
            // TODO(burdon): Check type (currently assumes Employee property).
            // Edge shouldn't contribute to force if it's not active.
            return edge.data?.object?.active !== false;
          },
        },
        forces: {
          point: {
            strength: 0.01,
          },
        },
      });
    }
  }, [context.current]);

  const graph = useRef<GraphController>(null);
  const selection = useMemo(() => _selection ?? new SelectionModel(), [_selection]);
  useEffect(() => graph.current?.repaint(), [selection.selected.value]);

  const handleSelect = useCallback<NonNullable<GraphProps['onSelect']>>(
    (node) => {
      if (selection.contains(node.id)) {
        selection.remove(node.id);
      } else {
        selection.add(node.id);
      }
    },
    [selection],
  );

  return (
    <SVG.Root ref={context} classNames={classNames}>
      <SVG.Markers />
      {grid && <SVG.Grid axis />}
      <SVG.Zoom extent={[1 / 2, 2]}>
        <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
          {...props}
          ref={graph}
          model={model}
          projector={projector}
          labels={{
            text: (node) => {
              return node.data?.data.label ?? node.id;
            },
          }}
          attributes={{
            node: (node: GraphLayoutNode<SpaceGraphNode>) => {
              const obj = node.data?.data.object;
              return {
                data: {
                  color: getHashColor(obj && Obj.getTypename(obj))?.color,
                },
                classes: {
                  'dx-selected': selection.contains(node.id),
                },
              };
            },
          }}
          onSelect={handleSelect}
        />
      </SVG.Zoom>
    </SVG.Root>
  );
};
