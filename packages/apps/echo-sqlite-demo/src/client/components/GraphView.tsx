//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import '@dxos/react-ui-graph/styles/graph.css';
import { Ref } from '@dxos/echo';
import * as GraphModel from '@dxos/graph/GraphModel';
import { type GraphController, GraphForceProjector, SVG, type SVGContext } from '@dxos/react-ui-graph';

import type { Organization, Person } from '../../schema.ts';

/**
 * The same objects the list shows, as a force-directed graph.
 *
 * Uses the themed stylesheet, since this app now runs ThemePlugin for `@dxos/react-ui`. The
 * standalone sheet remains for consumers that do not.
 */
export const GraphView = ({
  organizations,
  people,
}: {
  organizations: readonly Organization[];
  people: readonly Person[];
}) => {
  const svgRef = useRef<SVGContext>(null);
  const graphRef = useRef<GraphController>(null);
  const [projector, setProjector] = useState<GraphForceProjector>();

  useEffect(() => {
    if (svgRef.current) {
      // Pull nodes gently toward the centre so a small graph does not drift off-canvas.
      setProjector(new GraphForceProjector(svgRef.current, { forces: { point: { strength: 0.03 } } }));
    }
    // SVG.Graph owns projector start/stop.
  }, []);

  const model = useMemo(() => {
    const model = GraphModel.make();
    for (const org of organizations) {
      model.addNode({ id: org.id, type: 'organization', data: { label: org.name } });
    }
    for (const person of people) {
      model.addNode({ id: person.id, type: 'person', data: { label: person.name } });
      // Read synchronously: both queries are loaded, so the target is resident. A ref whose target
      // is not loaded simply contributes no edge rather than blocking the render.
      const employer = person.employer;
      const target = Ref.isRef(employer) ? employer.target : undefined;
      if (target) {
        model.addEdge({ source: person.id, target: target.id });
      }
    }
    return model;
  }, [organizations, people]);

  // The model is rebuilt per render rather than mutated, so the projector needs telling.
  useEffect(() => {
    graphRef.current?.refresh();
  }, [model]);

  return (
    <div className='dx-expand min-h-0'>
      <SVG.Root ref={svgRef}>
        <SVG.Markers />
        <SVG.Zoom extent={[1 / 2, 2]}>
          <SVG.Graph
            ref={graphRef}
            model={model}
            projector={projector}
            drag
            arrows
            labels={{ text: (node) => node.data?.label ?? node.id }}
            attributes={{
              // `graph.css` paints a node from `data-color`, so this is how a type becomes a colour.
              node: (node) => ({ data: { color: node.data?.type === 'person' ? 'cyan' : 'orange' } }),
            }}
          />
        </SVG.Zoom>
      </SVG.Root>
    </div>
  );
};
