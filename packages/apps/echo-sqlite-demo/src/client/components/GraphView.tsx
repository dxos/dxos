//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import '@dxos/react-ui-graph/styles/graph.css';
import { combine } from '@dxos/async';
import { Entity, Obj, Ref, Type } from '@dxos/echo';
import * as GraphModel from '@dxos/graph/GraphModel';
import { type GraphController, GraphForceProjector, type GraphProps, SVG, type SVGContext } from '@dxos/react-ui-graph';

import { getTypeIcon, types } from '../../schema.ts';
import { EntryCard } from './EntryCard.tsx';
import { type Entry } from './ListView.tsx';

/** The hover card's width, which the clamp below needs as a number. */
const CARD_WIDTH = 352;

/** Each type's hue, declared once on the schema. */
const HUES: Record<string, string | undefined> = Object.fromEntries(
  types.map((type) => [Type.getTypename(type), getTypeIcon(type)?.hue]),
);

/**
 * The same objects the list shows, as a force-directed graph.
 *
 * Uses the themed stylesheet, since this app now runs ThemePlugin for `@dxos/react-ui`. The
 * standalone sheet remains for consumers that do not.
 */
export const GraphView = ({
  objects,
  selected,
  onSelect,
  getEntry,
}: {
  selected?: string;
  onSelect?: (id: string) => void;
  /** The record behind a node, shown in a popover while the pointer is over it. */
  getEntry?: (id: string) => Entry | undefined;
  objects: readonly Obj.Unknown[];
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

  // An edge is a field, and a field changed in place leaves the query's array as it was — so the
  // graph would keep drawing the old edges (and the old labels) until something else re-rendered.
  // Subscribing to the objects themselves is what makes a re-assigned `employer` move its arrow.
  const [revision, setRevision] = useState(0);
  useEffect(
    () => combine(...objects.map((obj) => Entity.subscribe(obj, () => setRevision((revision) => revision + 1)))),
    [objects],
  );

  const model = useMemo(() => {
    const model = GraphModel.make();
    for (const obj of objects) {
      model.addNode({ id: obj.id, type: Obj.getTypename(obj)!, data: { label: Obj.getLabel(obj) ?? obj.id } });
    }
    // Edges are every ref the objects hold, single or multi-valued; nothing here names a property. Targets are read
    // synchronously, since every type is queried — a ref whose target is not resident contributes no edge rather
    // than blocking the render.
    for (const obj of objects) {
      for (const [property, value] of Object.entries(obj)) {
        if (property === 'id') {
          continue;
        }
        for (const item of Array.isArray(value) ? value : [value]) {
          const target = Ref.isRef(item) ? item.target : undefined;
          if (target) {
            model.addEdge({ source: obj.id, target: target.id });
          }
        }
      }
    }
    return model;
    // `revision` is the signal that a field changed; the objects themselves are read fresh here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, revision]);

  // The model is rebuilt per render rather than mutated, so the projector needs telling.
  useEffect(() => {
    graphRef.current?.refresh();
  }, [model]);

  // The card is placed here rather than by a Popover: a popup is positioned asynchronously, so its first frame
  // paints at the origin and the card flashes in the corner on every hover.
  const [hovered, setHovered] = useState<{ entry: Entry; x: number; y: number }>();
  const handleInspect = useCallback(
    (node: { id: string } | null, event: MouseEvent) => {
      const entry = node ? getEntry?.(node.id) : undefined;
      setHovered(entry ? { entry, x: event.clientX, y: event.clientY } : undefined);
    },
    [getEntry],
  );

  // The Graph bakes these into its renderer and rebuilds it — restarting the simulation — whenever one of them is a
  // new object, so every hover or selection would otherwise scatter the nodes it is about.
  const handleSelect = useCallback((node: { id: string }) => onSelect?.(node.id), [onSelect]);
  // A layout node's `data` is the model node, so its own data is one level in.
  const labels = useMemo<GraphProps['labels']>(() => ({ text: (node) => node.data?.data?.label ?? node.id }), []);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const attributes = useMemo<GraphProps['attributes']>(
    // The stylesheet paints a node from `data-color`, which carries the type's own hue, and rings `data-selected`.
    () => ({
      node: (node) => ({
        data: { color: HUES[node.data?.type ?? ''], selected: node.id === selectedRef.current ? 'true' : 'false' },
      }),
    }),
    [],
  );

  // Reading the selection from a ref keeps `attributes` stable, so the selection has to ask for the repaint that
  // applies it — which, unlike a rebuilt renderer, leaves the running simulation alone.
  useEffect(() => {
    graphRef.current?.repaint();
  }, [selected, model]);

  return (
    <div className='dx-expand'>
      <SVG.Root ref={svgRef}>
        <SVG.Markers />
        <SVG.Zoom extent={[1 / 2, 2]}>
          <SVG.Graph
            ref={graphRef}
            model={model}
            projector={projector}
            drag
            arrows
            onSelect={handleSelect}
            onInspect={handleInspect}
            labels={labels}
            attributes={attributes}
          />
        </SVG.Zoom>
      </SVG.Root>

      {/* In a portal: inside the pane it shares a stacking context with the splitter, whose line draws over it. */}
      {hovered &&
        createPortal(
          <div
            role='tooltip'
            className='fixed z-50 pointer-events-none'
            style={{
              width: CARD_WIDTH,
              // Beside the pointer, and inside the window when the node is near an edge.
              left: Math.max(8, Math.min(hovered.x + 16, window.innerWidth - CARD_WIDTH - 8)),
              top: Math.min(hovered.y + 16, window.innerHeight - 160),
            }}
          >
            <EntryCard entry={hovered.entry} />
          </div>,
          document.body,
        )}
    </div>
  );
};
