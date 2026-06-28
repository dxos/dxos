//
// Copyright 2023 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { SelectionModel } from '@dxos/graph';
import { composable, composableProps } from '@dxos/react-ui';
import {
  type GraphController,
  type GraphLayoutNode,
  type GraphProps,
  type SVGContext,
  SVG,
  GraphForceProjector,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, type SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { getHashStyles } from '@dxos/ui-theme';
import '@dxos/react-ui-graph/styles/graph.css';

const EMPTY_ATOM = Atom.make<{ nodes: SpaceGraphNode[]; edges: SpaceGraphEdge[] }>({ nodes: [], edges: [] });

export type ForceGraphProps = {
  model?: SpaceGraphModel;
  grid?: boolean;
  selection?: SelectionModel;
  onInspect?: GraphProps<SpaceGraphNode, SpaceGraphEdge>['onInspect'];
} & Pick<GraphProps, 'drag'>;

export const ForceGraph = composable<HTMLDivElement, ForceGraphProps>(
  ({ model, selection: selectionProp, grid, drag, onInspect, ...props }, forwardedRef) => {
    // TODO(wittjosiah): This should go into Graph.tsx but for some reason doesn't work.
    useAtomValue(model?.graphAtom ?? EMPTY_ATOM);

    const graph = useRef<GraphController>(null);
    const selection = useMemo(() => selectionProp ?? new SelectionModel(), [selectionProp]);
    useEffect(() => {
      const unsubscribe = selection.subscribe(() => graph.current?.repaint());
      return unsubscribe;
    }, [selection]);

    const svgRef = useRef<SVGContext>(null);
    const [projector, setProjector] = useState<GraphForceProjector>();
    useEffect(() => {
      if (svgRef.current) {
        setProjector(
          new GraphForceProjector(svgRef.current, {
            attributes: {
              // TODO(burdon): Check type (currently assumes Employee property).
              // Edge shouldn't contribute to force if it's not active.
              linkForce: (edge) => edge.data?.object?.active !== false,
            },
            forces: {
              point: {
                strength: 0.01,
              },
            },
          }),
        );
      }
      // SVG.Graph owns projector start/stop; nothing to clean up here.
    }, []);

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
              ref={graph}
              drag={drag}
              model={model}
              projector={projector}
              labels={{
                text: (node) => node.data?.data.label ?? node.id,
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
              onInspect={onInspect}
            />
          </SVG.Zoom>
        </SVG.Root>
      </div>
    );
  },
);
