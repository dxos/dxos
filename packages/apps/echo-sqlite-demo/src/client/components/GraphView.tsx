//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '@dxos/react-ui-graph/styles/graph.css';
import { Ref, Type } from '@dxos/echo';
import * as GraphModel from '@dxos/graph/GraphModel';
import { type GraphController, GraphForceProjector, SVG, type SVGContext } from '@dxos/react-ui-graph';
import * as Popover from '@dxos/react-ui/Popover';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import {
  type Organization,
  Organization as OrganizationType,
  type Person,
  Person as PersonType,
  getTypeIcon,
} from '../../schema.ts';
import { EntryCard } from './EntryCard.tsx';
import { type Entry } from './ListView.tsx';

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
  onSelect,
  getEntry,
}: {
  onSelect?: (id: string) => void;
  /** The record behind a node, shown in a popover while the pointer is over it. */
  getEntry?: (id: string) => Entry | undefined;
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

  // A point under the pointer is the anchor rather than the node itself: the force layout keeps moving
  // the nodes, and an anchor that moves drags the popover around with it.
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const positioning = VirtualAnchor.useVirtualAnchor(anchorRef);
  const [hovered, setHovered] = useState<Entry>();
  const handleInspect = useCallback(
    (node: { id: string } | null, event: MouseEvent) => {
      if (!node) {
        setHovered(undefined);
        return;
      }
      if (anchorRef.current) {
        anchorRef.current.style.left = `${event.clientX}px`;
        anchorRef.current.style.top = `${event.clientY}px`;
      }
      setHovered(getEntry?.(node.id));
    },
    [getEntry],
  );

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
            onSelect={(node) => onSelect?.(node.id)}
            onInspect={handleInspect}
            // A layout node's `data` is the model node, so its own data is one level in.
            labels={{ text: (node) => node.data?.data?.label ?? node.id }}
            attributes={{
              // The stylesheet paints a node from `data-color`, which carries the type's own hue.
              node: (node) => ({ data: { color: HUES[node.data?.type ?? ''] } }),
            }}
          />
        </SVG.Zoom>
      </SVG.Root>

      <div ref={anchorRef} className='fixed w-px h-px pointer-events-none' />

      <Popover.Root
        open={!!hovered}
        onOpenChange={({ open }) => !open && setHovered(undefined)}
        positioning={positioning}
      >
        <Popover.Content classNames='dx-card-popover-width'>
          <Popover.Body>{hovered && <EntryCard entry={hovered} />}</Popover.Body>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};
