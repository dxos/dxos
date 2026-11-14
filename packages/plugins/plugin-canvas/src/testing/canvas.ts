//
// Copyright 2026 DXOS.org
//

import { type ContentMap } from '@dxos/diagram';
import { type Database, Obj } from '@dxos/echo';
import { rootOf } from '@dxos/react-ui-canvas/headless';
import { Scene } from '@dxos/scene';

import { type Canvas } from '#types';

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
