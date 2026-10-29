//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useObject } from '@dxos/echo-react';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { DEFAULT_GRID } from '@dxos/react-ui-canvas/scene';
import { Form, type FormFieldOverride } from '@dxos/react-ui-form';

import { canvasRecordOf, deleteStyleClass, readStyles, styleClassUses, updateCanvasRecord, writeStyles } from '#model';
import { Canvas, Settings } from '#types';

import { StyleClassList } from './StyleClassList.tsx';

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
  theme: Schema.optional(
    Settings.ThemeChoice.annotate({
      title: 'Theme',
      description: "How this drawing is drawn, for everyone; unset, each viewer's default.",
    }),
  ),
  styleSet: Schema.optional(
    Settings.StyleSetChoice.annotate({
      title: 'Style set',
      description: "Shapes and links in another style set than the theme's.",
    }),
  ),
  background: Schema.optional(
    Settings.BackgroundChoice.annotate({
      title: 'Background',
      description: "Another background than the theme's.",
    }),
  ),
});

/** Unset, a select shows nothing rather than its description, which reads as a value. */
const FIELD_OVERRIDES: Record<string, FormFieldOverride> = {
  theme: { placeholder: '' },
  styleSet: { placeholder: '' },
  background: { placeholder: '' },
};

/** A stored id as a built-in choice; an id this host does not know (from a newer one) shows as unset. */
const isThemeChoice = Schema.is(Settings.ThemeChoice);
const isStyleSetChoice = Schema.is(Settings.StyleSetChoice);
const isBackgroundChoice = Schema.is(Settings.BackgroundChoice);

type CanvasPropertiesValues = Schema.Schema.Type<typeof CanvasPropertiesSchema>;

export type CanvasPropertiesProps = { drawing: Drawing.Drawing };

/** The drawing's canvas settings in the properties companion; renders nothing for another renderer's drawing. */
export const CanvasProperties = ({ drawing }: CanvasPropertiesProps) => {
  const [canvas, updateCanvas] = useObject(drawing.canvas);
  const values = useMemo<CanvasPropertiesValues>(() => {
    const record = canvas ? canvasRecordOf(canvas.content) : undefined;
    return {
      lattice: record?.lattice,
      grid: record?.grid ?? DEFAULT_GRID,
      theme: isThemeChoice(record?.theme) ? record.theme : undefined,
      styleSet: isStyleSetChoice(record?.styleSet) ? record.styleSet : undefined,
      background: isBackgroundChoice(record?.background) ? record.background : undefined,
    };
  }, [canvas]);
  const handleSave = useCallback(
    (next: CanvasPropertiesValues) =>
      updateCanvas((canvas) => {
        updateCanvasRecord(canvas.content, {
          lattice: next.lattice || undefined,
          grid: next.grid === DEFAULT_GRID ? undefined : next.grid,
          theme: next.theme,
          styleSet: next.styleSet,
          background: next.background,
        });
      }),
    [updateCanvas],
  );

  // The drawing's style classes: renamed in place; deleting one leaves its look on the elements that took it.
  const classes = useMemo(() => Object.values(readStyles(canvas?.styles)), [canvas]);
  const uses = useMemo(() => (canvas ? styleClassUses(canvas.content) : {}), [canvas]);
  const handleRename = useCallback(
    (id: string, name: string) =>
      updateCanvas((canvas) => {
        const styles = readStyles(canvas.styles);
        const styleClass = styles[id];
        if (styleClass && styleClass.name !== name) {
          canvas.styles ??= {};
          writeStyles(canvas.styles, { ...styles, [id]: { ...styleClass, name } });
        }
      }),
    [updateCanvas],
  );
  const handleDelete = useCallback(
    (id: string) =>
      updateCanvas((canvas) => {
        canvas.styles ??= {};
        deleteStyleClass(canvas.content, canvas.styles, id);
      }),
    [updateCanvas],
  );

  // A newer plugin's format is read-only here, and every control below writes the canvas.
  if (!canvas || !Canvas.isSceneSchema(canvas.schema) || Canvas.isNewerScene(canvas.schema)) {
    return null;
  }

  return (
    <>
      <Form.Root
        schema={CanvasPropertiesSchema}
        values={values}
        fieldOverrides={FIELD_OVERRIDES}
        autoSave
        onSave={handleSave}
      >
        <Form.Fields />
      </Form.Root>
      <StyleClassList classes={classes} uses={uses} onRename={handleRename} onDelete={handleDelete} />
    </>
  );
};

CanvasProperties.displayName = 'CanvasProperties';
