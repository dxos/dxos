//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import '@dxos/react-ui-graph/styles/graph.css';
import { Ref, Type } from '@dxos/echo';
import * as GraphModel from '@dxos/graph/GraphModel';
import { type GraphController, GraphForceProjector, SVG, type SVGContext } from '@dxos/react-ui-graph';

import {
  type Organization,
  Organization as OrganizationType,
  type Person,
  Person as PersonType,
  getTypeIcon,
} from '../../schema.ts';

/** Each type's hue, declared once on the schema. */
const HUES: Record<string, string | undefined> = {
  [Type.getTypename(OrganizationType)!]: getTypeIcon(OrganizationType)?.hue,
  [Type.getTypename(PersonType)!]: getTypeIcon(PersonType)?.hue,
};

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
      model.addNode({ id: org.id, type: Type.getTypename(OrganizationType)!, data: { label: org.name } });
    }
    for (const person of people) {
      model.addNode({ id: person.id, type: Type.getTypename(PersonType)!, data: { label: person.name } });
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
            // A layout node's `data` is the model node, so its own data is one level in.
            labels={{ text: (node) => node.data?.data?.label ?? node.id }}
            attributes={{
              // The stylesheet paints a node from `data-color`, which carries the type's own hue.
              node: (node) => ({ data: { color: HUES[node.data?.type ?? ''] } }),
            }}
          />
        </SVG.Zoom>
      </SVG.Root>
    </div>
  );
};
