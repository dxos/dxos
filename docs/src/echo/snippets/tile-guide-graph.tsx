//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import '@dxos/react-ui-graph/styles/graph.css';
import * as GraphModel from '@dxos/graph/GraphModel';
import {
  GraphForceProjector,
  type GraphProps,
  SVG,
  type SVGContext,
} from '@dxos/react-ui-graph';

// #region graph
const TEAMS: Record<string, string[]> = {
  Design: ['Ada', 'Grace', 'Linus'],
  Platform: ['Alan', 'Barbara', 'Ken', 'Dennis'],
  Research: ['Edsger', 'Donald', 'Tony'],
};

/** A node per team and per person, an edge from each person to their team. */
const makeModel = () => {
  const model = GraphModel.make();
  for (const [team, people] of Object.entries(TEAMS)) {
    model.addNode({ id: team, type: 'team', data: { label: team } });
    for (const person of people) {
      model.addNode({ id: person, type: 'person', data: { label: person } });
      model.addEdge({ source: person, target: team });
    }
  }
  return model;
};

const labels: GraphProps['labels'] = {
  text: (node) => node.data?.data?.label ?? node.id,
};

/** A node's `data-color` picks its fill from the graph styles; here, one color for teams and one for people. */
const attributes: GraphProps['attributes'] = {
  node: (node) => ({
    data: { color: node.data?.type === 'team' ? 'sky' : 'amber' },
  }),
};

/** People and their teams, laid out by force: hover a node for its name, drag it, or scroll to zoom. */
export const TeamGraph = () => {
  const model = useMemo(makeModel, []);
  // The projector needs the SVG context, which exists only once `SVG.Root` has mounted.
  const svgRef = useRef<SVGContext>(null);
  const [projector, setProjector] = useState<GraphForceProjector>();
  useEffect(() => {
    if (svgRef.current) {
      setProjector(
        new GraphForceProjector(svgRef.current, {
          forces: { point: { strength: 0.05 } },
        }),
      );
    }
  }, []);

  return (
    <SVG.Root ref={svgRef}>
      <SVG.Markers />
      <SVG.Zoom extent={[1 / 2, 2]}>
        <SVG.Graph
          model={model}
          projector={projector}
          drag
          labels={labels}
          attributes={attributes}
        />
      </SVG.Zoom>
    </SVG.Root>
  );
};
// #endregion
