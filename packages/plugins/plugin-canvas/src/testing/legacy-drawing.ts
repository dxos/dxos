//
// Copyright 2026 DXOS.org
//

//
// Legacy scene drawings for the migration's tests: a `Drawing.Canvas` of v2 records, as drawings were made before
// `Canvas`, and the illustrator builder that wrote them. Nothing outside tests makes one any more.
//

import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';
import { SceneHandler } from '@dxos/react-ui-canvas';
import { type CanvasRecord, seedContent, updateCanvasRecord } from '@dxos/react-ui-canvas/headless';

import { Canvas } from '#types';

/** A fresh legacy scene canvas: the root scene with the drawing's `settings`. */
export const makeLegacyCanvas = (settings: Partial<Omit<CanvasRecord, 'kind' | 'root'>> = {}): Drawing.Canvas => {
  const content = {};
  seedContent(content);
  updateCanvasRecord(content, settings);
  return Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content });
};

/** The illustrator's builder over a legacy scene canvas's records, as the hidden legacy variant had it. */
export const LegacyCanvasBuilder = IllustratorModel.makeBuilder({ schema: Canvas.SCENE_SCHEMA, handler: SceneHandler });
