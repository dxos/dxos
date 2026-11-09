//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { combine } from '@dxos/async';
import { Entity, Obj, Ref, Type } from '@dxos/echo';
import * as GraphModel from '@dxos/graph/GraphModel';
import { type GraphController, GraphForceProjector, type GraphProps, SVG, type SVGContext } from '@dxos/react-ui-graph';

import { getTypeIcon, types } from '../schema.ts';

/** Each type's hue, declared once on its schema. */
const HUES: Record<string, string | undefined> = Object.fromEntries(
  types.map((type) => [Type.getTypename(type), getTypeIcon(type)?.hue]),
);

export type RecordGraphProps = {
  records: readonly Obj.Unknown[];
  selected?: string;
  onSelect: (id: string) => void;
};

/** Every record as a node and every reference as an edge, laid out by force. */
export const RecordGraph = ({ records, selected, onSelect }: RecordGraphProps) => {
  const svgRef = useRef<SVGContext>(null);
  const graphRef = useRef<GraphController>(null);
  const [projector, setProjector] = useState<GraphForceProjector>();
  useEffect(() => {
    if (svgRef.current) {
      setProjector(new GraphForceProjector(svgRef.current, { forces: { point: { strength: 0.03 } } }));
    }
  }, []);

  // A field changed in place leaves the query's array as it was, so the graph subscribes to each record to redraw
  // an edge whose reference moved.
  const [revision, setRevision] = useState(0);
  useEffect(
    () => combine(...records.map((record) => Entity.subscribe(record, () => setRevision((revision) => revision + 1)))),
    [records],
  );

  const model = useMemo(() => {
    const model = GraphModel.make();
    for (const record of records) {
      model.addNode({
        id: record.id,
        type: Obj.getTypename(record)!,
        data: { label: Obj.getLabel(record) ?? record.id },
      });
    }
    for (const record of records) {
      for (const [property, value] of Object.entries(record)) {
        if (property === 'id') {
          continue;
        }
        for (const item of Array.isArray(value) ? value : [value]) {
          const target = Ref.isRef(item) ? item.peek() : undefined;
          if (target) {
            model.addEdge({ source: record.id, target: target.id });
          }
        }
      }
    }
    return model;
    // `revision` is the signal that a field changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, revision]);

  useEffect(() => {
    graphRef.current?.refresh();
  }, [model]);

  // Stable callbacks and attributes: the graph rebuilds its renderer, and restarts the layout, when one changes.
  const handleSelect = useCallback((node: { id: string }) => onSelect(node.id), [onSelect]);
  const labels = useMemo<GraphProps['labels']>(() => ({ text: (node) => node.data?.data?.label ?? node.id }), []);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const attributes = useMemo<GraphProps['attributes']>(
    () => ({
      node: (node) => ({
        data: { color: HUES[node.data?.type ?? ''], selected: node.id === selectedRef.current ? 'true' : 'false' },
      }),
    }),
    [],
  );

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
            labels={labels}
            attributes={attributes}
          />
        </SVG.Zoom>
      </SVG.Root>
    </div>
  );
};
