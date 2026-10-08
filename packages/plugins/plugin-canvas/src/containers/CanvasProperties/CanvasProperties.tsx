//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useObject } from '@dxos/echo-react';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { DEFAULT_GRID } from '@dxos/react-ui-canvas/scene';
import { Form } from '@dxos/react-ui-form';

import { canvasRecordOf, updateCanvasRecord } from '#model';
import { Canvas } from '#types';

const CanvasPropertiesSchema = Schema.Struct({
  lattice: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Lattice',
      description: 'Shapes snap to cells and links route along the gutters between them.',
    }),
  ),
  grid: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 4, maximum: 128 })).annotate({
      title: 'Grid size',
      description: 'Spacing of the minor grid, in px.',
    }),
  ),
});

type CanvasPropertiesValues = Schema.Schema.Type<typeof CanvasPropertiesSchema>;

export type CanvasPropertiesProps = { drawing: Drawing.Drawing };

/** The drawing's canvas settings in the properties companion; renders nothing for another renderer's drawing. */
export const CanvasProperties = ({ drawing }: CanvasPropertiesProps) => {
  const [canvas, updateCanvas] = useObject(drawing.canvas);
  const values = useMemo<CanvasPropertiesValues>(() => {
    const record = canvas ? canvasRecordOf(canvas.content) : undefined;
    return { lattice: record?.lattice, grid: record?.grid ?? DEFAULT_GRID };
  }, [canvas]);
  const handleSave = useCallback(
    (next: CanvasPropertiesValues) =>
      updateCanvas((canvas) => {
        updateCanvasRecord(canvas.content, {
          lattice: next.lattice || undefined,
          grid: next.grid === DEFAULT_GRID ? undefined : next.grid,
        });
      }),
    [updateCanvas],
  );

  if (!canvas || canvas.schema !== Canvas.SCENE_SCHEMA) {
    return null;
  }

  return (
    <Form.Root schema={CanvasPropertiesSchema} values={values} autoSave onSave={handleSave}>
      <Form.Fields />
    </Form.Root>
  );
};

CanvasProperties.displayName = 'CanvasProperties';
