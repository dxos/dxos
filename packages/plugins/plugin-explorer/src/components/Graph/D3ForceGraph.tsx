//
// Copyright 2023 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { type ComponentPropsWithoutRef, useCallback, useEffect, useMemo, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { SelectionModel } from '@dxos/graph';
import {
  type GraphController,
  GraphForceProjector,
  type GraphLayoutNode,
  type GraphProps,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { composable, composableProps, getHashStyles } from '@dxos/ui-theme';

import '@dxos/react-ui-graph/styles/graph.css';

export type D3ForceGraphProps = {
  model?: SpaceGraphModel;
  match?: RegExp;
  selection?: SelectionModel;
  grid?: boolean;
} & Pick<GraphProps, 'drag'> &
  ComponentPropsWithoutRef<'div'>;

const EMPTY_ATOM = Atom.make<{ nodes: SpaceGraphNode[]; edges: SpaceGraphEdge[] }>({ nodes: [], edges: [] });

export const D3ForceGraph = composable<HTMLDivElement, D3ForceGraphProps>(
  ({ model, selection: _selection, grid, drag, ...props }, forwardedRef) => {
    // TODO(wittjosiah): This should go into Graph.tsx but for some reason doesn't work.
    useAtomValue(model?.graphAtom ?? EMPTY_ATOM);

    const svgRef = useRef<SVGContext>(null);
    const projector = useMemo<GraphForceProjector | undefined>(() => {
      if (svgRef.current) {
        return new GraphForceProjector(svgRef.current, {
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
    }, []);

    const graph = useRef<GraphController>(null);
    const selection = useMemo(() => _selection ?? new SelectionModel(), [_selection]);
    useEffect(() => selection.subscribe(() => graph.current?.repaint()), [selection]);

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
      <div {...composableProps(props, { classNames: 'dx-container' })} ref={forwardedRef}>
        <SVG.Root ref={svgRef}>
          <SVG.Markers />
          {grid && <SVG.Grid axis />}
          <SVG.Zoom extent={[1 / 2, 2]}>
            <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
              drag={drag}
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
                      color: getHashStyles(obj && Obj.getTypename(obj))?.hue,
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
      </div>
    );
  },
);
