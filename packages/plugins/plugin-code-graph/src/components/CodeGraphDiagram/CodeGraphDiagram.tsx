//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Scene } from '@dxos/diagram';
import * as SceneSvg from '@dxos/plugin-illustrator/SceneSvg';

export type CodeGraphDiagramProps = {
  /** The illustrator's drawing of the graph: boxes, package frames and routed arrows. */
  objects: readonly Scene.WorldObject[];
  /** The selected box, by IRI. */
  selected?: string;
  /** A box clicked or double-clicked, by IRI. */
  onSelect?: (id: string | undefined) => void;
};

/**
 * The illustrator's own rendering of the graph, read-only: the same semantic layout the canvas borrows positions
 * from, drawn with its frames and gutter-routed arrows. Boxes carry their IRI as `ref`, which maps selection back.
 */
export const CodeGraphDiagram = ({ objects, selected, onSelect }: CodeGraphDiagramProps) => {
  const { toObject, toIri } = useMemo(() => {
    const toObject = new Map<string, string>();
    const toIri = new Map<string, string>();
    for (const object of objects) {
      if (object.ref) {
        toObject.set(object.ref, object.id);
        toIri.set(object.id, object.ref);
      }
    }
    return { toObject, toIri };
  }, [objects]);

  const selection = useMemo(() => {
    const id = selected && toObject.get(selected);
    return id ? [id] : [];
  }, [selected, toObject]);

  const handleSelectionChange = useCallback(
    (ids: readonly string[]) => onSelect?.(ids.map((id) => toIri.get(id)).find((iri) => iri !== undefined)),
    [toIri, onSelect],
  );

  return (
    <div className='dx-cover overflow-auto p-4'>
      <SceneSvg.SceneSvg
        classNames='max-w-none'
        objects={objects}
        selection={selection}
        onSelectionChange={handleSelectionChange}
        onActivate={(id) => onSelect?.(toIri.get(id))}
      />
    </div>
  );
};
