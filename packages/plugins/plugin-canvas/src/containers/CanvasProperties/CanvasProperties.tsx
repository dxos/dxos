//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject, useObjectValue } from '@dxos/echo-react';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { latticeGrid, namedStyles, styleClasses } from '@dxos/react-ui-canvas/headless';
import { Form, type FormFieldOverride } from '@dxos/react-ui-form';
import { DEFAULT_GRID, MAJOR_GRID_RATIO, type Scene, type StyleClass } from '@dxos/scene';

import {
  canvasModel2D,
  deleteNamedStyle,
  layoutLatticeSpec,
  namedStyleUses,
  setLayoutLattice,
  withoutMode,
} from '#model';
import { Canvas, Settings } from '#types';

import { StyleClassList } from './StyleClassList.tsx';

/** The minor pitches the form accepts. */
const GRID_RANGE = { minimum: 4, maximum: 128 };

const CanvasPropertiesSchema = Schema.Struct({
  lattice: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Lattice',
      description: 'Shapes snap to cells and links route along the gutters between them.',
    }),
  ),
  grid: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween(GRID_RANGE)).annotate({
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
  const [snapshot] = useObject(drawing.canvas);
  const canvas = snapshot ? drawing.canvas.target : undefined;
  return Canvas.isCanvas(canvas) ? <SceneCanvasProperties canvas={canvas} /> : null;
};

/** The grid an unset pitch draws: a lattice's runs along its cell edges, when the form can show that pitch. */
const defaultGrid = (lattice: Scene.Layout2D['lattice']): number => {
  const grid = lattice ? latticeGrid(lattice, MAJOR_GRID_RATIO) : 0;
  return Number.isInteger(grid) && grid >= GRID_RANGE.minimum && grid <= GRID_RANGE.maximum ? grid : DEFAULT_GRID;
};

const valuesOf = (
  record: Partial<Canvas.CanvasSettings> | undefined,
  lattice: Scene.Layout2D['lattice'],
): CanvasPropertiesValues => ({
  lattice: lattice !== undefined || undefined,
  grid: record?.grid ?? defaultGrid(lattice),
  theme: isThemeChoice(record?.theme) ? record.theme : undefined,
  styleSet: isStyleSetChoice(record?.styleSet) ? record.styleSet : undefined,
  background: isBackgroundChoice(record?.background) ? record.background : undefined,
});

/** A pitch left at what the form showed keeps its stored value, so an unset one follows the lattice as it toggles. */
const settingsOf = (
  next: CanvasPropertiesValues,
  stored: number | undefined,
  shown: number,
): Partial<Canvas.CanvasSettings> => ({
  lattice: next.lattice || undefined,
  grid: next.grid === shown ? stored : next.grid,
  theme: next.theme,
  styleSet: next.styleSet,
  background: next.background,
});

/** A `Canvas`'s settings and style classes; a class's uses are counted across its open scene's layouts. */
const SceneCanvasProperties = ({ canvas: subject }: { canvas: Canvas.Canvas }) => {
  const [canvas] = useObject(subject);
  const handleSave = useCallback(
    (next: CanvasPropertiesValues) => {
      // The lattice is each layout's own mode, so the toggle writes the layouts rather than the settings.
      const lattice = layoutLatticeSpec(subject);
      const stored = subject.settings?.grid;
      const shown = stored ?? defaultGrid(lattice);
      next.lattice !== (lattice !== undefined) && setLayoutLattice(subject, next.lattice === true);
      Obj.update(subject, (subject) => {
        // ECHO stores no `undefined`, so an unset value removes its key.
        subject.settings = Object.fromEntries(
          Object.entries({ ...subject.settings, ...withoutMode(settingsOf(next, stored, shown)) }).filter(
            ([, value]) => value !== undefined,
          ),
        );
      });
    },
    [subject],
  );
  // The style classes are the canvas model's named styles.
  const styleModel = canvasModel2D(subject);
  const model = useObjectValue(styleModel);
  const classes = useMemo(() => Object.values(styleClasses(model?.styles)), [model]);
  const uses = useMemo(() => namedStyleUses(subject), [canvas, subject]);
  const handleRename = useCallback(
    (id: string, name: string) => {
      const styles = styleClasses(styleModel?.styles);
      const styleClass = styles[id];
      if (styleModel && styleClass && styleClass.name !== name) {
        Obj.update(styleModel, (styleModel) => {
          styleModel.styles = namedStyles({ ...styles, [id]: { ...styleClass, name } });
        });
      }
    },
    [styleModel],
  );
  const handleDelete = useCallback((id: string) => deleteNamedStyle(subject, id), [subject]);
  return (
    <PropertiesView
      values={valuesOf(canvas.settings, layoutLatticeSpec(subject))}
      onSave={handleSave}
      classes={classes}
      uses={uses}
      onRename={handleRename}
      onDelete={handleDelete}
    />
  );
};

type PropertiesViewProps = {
  values: CanvasPropertiesValues;
  onSave: (next: CanvasPropertiesValues) => void;
  classes: StyleClass[];
  uses: Readonly<Record<string, number>>;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

const PropertiesView = ({ values, onSave, classes, uses, onRename, onDelete }: PropertiesViewProps) => (
  <>
    <Form.Root
      schema={CanvasPropertiesSchema}
      values={values}
      fieldOverrides={FIELD_OVERRIDES}
      autoSave
      onSave={onSave}
    >
      <Form.Fields />
    </Form.Root>
    <StyleClassList classes={classes} uses={uses} onRename={onRename} onDelete={onDelete} />
  </>
);

CanvasProperties.displayName = 'CanvasProperties';
