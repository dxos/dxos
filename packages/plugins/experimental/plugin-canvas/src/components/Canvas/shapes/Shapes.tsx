//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Markers, useProjection } from '@dxos/react-ui-canvas';

import { DEFS_ID, MARKER_PREFIX, ShapeComponent } from './Shape';
import { type Layout, useEditorContext } from '../../../hooks';

export type ShapesProps = { layout: Layout };

/**
 * Render shapes.
 */
export const Shapes = ({ layout: { shapes } }: ShapesProps) => {
  const { selection } = useEditorContext();
  const { scale } = useProjection();

  const handleSelection = useCallback(
    (id: string, shift: boolean) => selection.toggleSelected([id], shift),
    [selection],
  );

  return (
    <>
      <svg id={DEFS_ID} className='absolute w-0 h-0'>
        <defs>
          <Markers id={MARKER_PREFIX} />
        </defs>
      </svg>

      {shapes.map((shape) => (
        <ShapeComponent
          key={shape.id}
          shape={shape}
          scale={scale}
          selected={selection.contains(shape.id)}
          onSelect={handleSelection}
        />
      ))}
    </>
  );
};
