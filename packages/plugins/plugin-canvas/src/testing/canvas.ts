//
// Copyright 2026 DXOS.org
//

import { type ContentMap } from '@dxos/diagram';
import { type Database } from '@dxos/echo';

import { type Canvas } from '#types';

import { editCanvasContent } from '../model/canvas-content.ts';
import { makeCanvas } from '../model/canvas-document.ts';
import { rootOf } from '../model/content.ts';

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
  for (const object of [model, layout, scene]) {
    db.add(object);
  }
  db.add(canvas);
  editCanvasContent(canvas, (content) => seed(content, rootOf(content) ?? ''));
  return canvas;
};
