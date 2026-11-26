//
// Copyright 2026 DXOS.org
//

import { type ContentMap } from '@dxos/diagram';
import { type Database, Obj, Ref } from '@dxos/echo';
import { rootOf } from '@dxos/react-ui-canvas/headless';
import { Scene, toEcho } from '@dxos/scene';

import { Canvas } from '#types';

import { editCanvasContent } from '../model/canvas-content.ts';
import { makeCanvas } from '../model/canvas-document.ts';
import { applyLayoutIntent } from '../model/layout-source.ts';

/**
 * Adds a 2D `Canvas` with `settings` and its objects to `db`, then lets `seed` fill its open scene through content
 * records keyed under `root`, so stories write elements as the command bridge does.
 */
export const addTestCanvas = (
  db: Database.Database,
  seed: (content: ContentMap, root: string) => void = () => {},
  settings: Partial<Canvas.CanvasSettings> = {},
): Canvas.Canvas => {
  const { canvas, model, layout, scene } = makeCanvas(settings);
  // A drawing's pitch lives on its layout; `adoptLayoutMode` carries the lattice and the projection across but not
  // this, so a setting that asks for a pitch is written where snapping and the drawn grid read it.
  if (settings.grid !== undefined && Obj.instanceOf(Scene.Layout2D, layout)) {
    applyLayoutIntent(layout, { kind: 'layout', patch: { grid: settings.grid } });
  }
  for (const object of [model, layout, scene]) {
    db.add(object);
  }
  db.add(canvas);
  editCanvasContent(canvas, (content) => seed(content, rootOf(content) ?? ''));
  return canvas;
};

/**
 * Adds a `Canvas` over `document` to `db` and leaves its scenes, layouts and model out, as a canvas whose objects have
 * not loaded yet. `arrive` adds them, which changes nothing on the canvas: only its references resolve.
 */
export const addUnloadedCanvas = (
  db: Database.Database,
  document: Scene.SceneDocument,
): { canvas: Canvas.Canvas; arrive: () => void } => {
  const stored = toEcho(document);
  const model = stored.models.values().next().value;
  const scenes = [stored.root, ...[...stored.scenes.values()].filter((scene) => scene !== stored.root)];
  const canvas = db.add(
    Obj.make(Canvas.Canvas, {
      settings: {},
      // An inlined target reads as loaded before its object is in the database.
      ...(model ? { model: Ref.make(model).noInline() } : {}),
      layouts: [...stored.layouts.values()].map((layout) => Ref.make(layout).noInline()),
      scenes: scenes.map((scene) => Ref.make(scene).noInline()),
    }),
  );
  return {
    canvas,
    arrive: () =>
      [...stored.models.values(), ...stored.layouts.values(), ...scenes].forEach((object) => db.add(object)),
  };
};
