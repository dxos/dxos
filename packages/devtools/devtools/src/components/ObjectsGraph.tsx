//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { type Database, type Filter, Obj } from '@dxos/echo';
import {
  type GraphController,
  GraphForceProjector,
  type GraphLayoutNode,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';
import { type SpaceGraphEdge, SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';
import { getHashStyles } from '@dxos/ui-theme';
import '@dxos/react-ui-graph/styles/graph.css';

export type ObjectsGraphProps = {
  db: Database.Database;
  /** Narrows the graph to matching objects (and the relations between them). */
  filter?: Filter.Any;
  selected?: string;
  onSelect?: (object: Obj.Unknown) => void;
};

/**
 * The space as a force-directed graph: objects as nodes, references and relations as edges. Built on
 * the same {@link SpaceGraphModel} the explorer plugin renders.
 */
export const ObjectsGraph = ({ db, filter, selected, onSelect }: ObjectsGraphProps) => {
  const registry = useContext(RegistryContext);
  const [model, setModel] = useState<SpaceGraphModel>();
  useEffect(() => {
    const model = new SpaceGraphModel({ registry });
    void model.open(db);
    setModel(model);
    return () => {
      setModel(undefined);
      void model.close();
    };
  }, [db, registry]);

  useEffect(() => {
    model?.setFilter(filter);
  }, [model, filter]);

  // The graph renders imperatively, so it repaints from the model's atom rather than from React.
  useAtomValue(model?.graphAtom ?? EMPTY_GRAPH);

  const graphRef = useRef<GraphController>(null);
  useEffect(() => graphRef.current?.repaint(), [selected]);

  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphForceProjector>();
  useEffect(() => {
    if (svgRef.current) {
      setProjector(new GraphForceProjector(svgRef.current, { forces: { point: { strength: 0.01 } } }));
    }
  }, []);

  return (
    <div className='dx-expand' data-testid='objects-graph'>
      <SVG.Root ref={svgRef}>
        <SVG.Markers />
        <SVG.Zoom extent={[1 / 4, 4]}>
          <SVG.Graph<SpaceGraphNode, SpaceGraphEdge>
            ref={graphRef}
            drag
            arrows
            model={model}
            projector={projector}
            labels={{ text: (node) => node.data?.data.label ?? node.id }}
            attributes={{
              node: (node: GraphLayoutNode<SpaceGraphNode>) => {
                const object = node.data?.data.object;
                return {
                  data: { color: getHashStyles(object && Obj.getTypename(object))?.hue },
                  classes: { 'dx-selected': node.id === selected },
                };
              },
            }}
            onSelect={(node) => {
              const object = node.data?.data.object;
              if (object) {
                onSelect?.(object);
              }
            }}
          />
        </SVG.Zoom>
      </SVG.Root>
    </div>
  );
};

ObjectsGraph.displayName = 'ObjectsGraph';

const EMPTY_GRAPH = Atom.make<{ nodes: SpaceGraphNode[]; edges: SpaceGraphEdge[] }>({ nodes: [], edges: [] });
