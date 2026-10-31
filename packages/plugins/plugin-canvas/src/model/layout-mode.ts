//
// Copyright 2026 DXOS.org
//

//
// A 2D layout's mode (lattice, constrained, dynamic) is its own fields, which the shared editor's `constrain2D`
// applies; a canvas's settings named it once, for every View, so a canvas still carrying that setting moves it onto
// its layouts when it opens for writing.
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { DEFAULT_LATTICE } from '@dxos/react-ui-canvas';
import { Scene } from '@dxos/scene';

import { Canvas } from '#types';

import { openScene } from './canvas-document.ts';
import { applyLayoutIntent, canvasLayouts } from './layout-source.ts';
import { plain } from './records.ts';

const DYNAMIC: Scene.Arrangement = { kind: 'dynamic' };

const isConstraints = Schema.is(Schema.Array(Scene.Constraint));

/** The constraints the constrained projection kept in a layout's props, before they were the layout's own. */
const keptConstraints = (props: unknown): readonly Scene.Constraint[] => {
  const constrained: unknown =
    typeof props === 'object' && props !== null ? Reflect.get(props, 'constrained') : undefined;
  const constraints: unknown =
    typeof constrained === 'object' && constrained !== null ? Reflect.get(constrained, 'constraints') : undefined;
  return isConstraints(constraints) ? plain(constraints) : [];
};

type ModeFields = Pick<Scene.LayoutRecord2D, 'lattice' | 'constraints' | 'arrange' | 'props'>;

/** The mode fields `settings` names, over the ones a layout already has; undefined when it adds none. */
const modeFields = (layout: ModeFields, settings: Partial<Canvas.CanvasSettings>): ModeFields | undefined => {
  switch (Canvas.projectionOf(settings)) {
    case 'lattice':
      return layout.lattice ? undefined : { lattice: DEFAULT_LATTICE };
    case 'constrained':
      return layout.constraints ? undefined : { constraints: keptConstraints(layout.props) };
    case 'dynamic':
      return layout.arrange ? undefined : { arrange: DYNAMIC };
    default:
      return undefined;
  }
};

/** A 2D layout record in the mode a legacy canvas's settings named, so the mode travels with the layout. */
export const withSettingsMode = (
  layout: Scene.LayoutRecord2D,
  settings: Partial<Canvas.CanvasSettings>,
): Scene.LayoutRecord2D => {
  const fields = modeFields(layout, settings);
  return fields ? { ...layout, ...fields } : layout;
};

/** Settings without the mode, which the layouts hold. */
export const withoutMode = <S extends Partial<Canvas.CanvasSettings>>({
  lattice: _lattice,
  projection: _projection,
  ...settings
}: S): Omit<S, 'lattice' | 'projection'> => settings;

const layouts2D = (canvas: Canvas.Canvas): Scene.Layout2D[] =>
  [...canvasLayouts(canvas).values()].filter((layout) => Obj.instanceOf(Scene.Layout2D, layout));

/**
 * Moves the mode a canvas's settings name onto each of its 2D layouts that has none, and removes it from the settings.
 * Returns whether it wrote anything.
 */
export const adoptLayoutMode = (canvas: Canvas.Canvas): boolean => {
  if (canvas.settings.lattice === undefined && canvas.settings.projection === undefined) {
    return false;
  }
  for (const layout of layouts2D(canvas)) {
    const fields = modeFields(layout, canvas.settings);
    if (fields?.arrange) {
      const arrange = fields.arrange;
      Obj.update(layout, (layout) => {
        layout.arrange = arrange;
      });
    } else if (fields) {
      applyLayoutIntent(layout, {
        kind: 'layout',
        patch: {
          ...(fields.lattice ? { lattice: fields.lattice } : {}),
          ...(fields.constraints ? { constraints: fields.constraints } : {}),
        },
      });
    }
  }
  Obj.update(canvas, (canvas) => {
    canvas.settings = withoutMode(canvas.settings);
  });
  return true;
};

/** Whether the canvas's open 2D scene lays its shapes on a lattice. */
export const layoutLattice = (canvas: Canvas.Canvas): boolean => {
  const layout = openScene(canvas)?.layout.target;
  return Obj.instanceOf(Scene.Layout2D, layout) && layout.lattice !== undefined;
};

/** Puts every 2D layout of the canvas on the default lattice, or takes them off it. */
export const setLayoutLattice = (canvas: Canvas.Canvas, lattice: boolean): void => {
  for (const layout of layouts2D(canvas)) {
    (layout.lattice !== undefined) !== lattice &&
      applyLayoutIntent(layout, { kind: 'layout', patch: { lattice: lattice ? DEFAULT_LATTICE : undefined } });
  }
};
