//
// Copyright 2026 DXOS.org
//

import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { Canvas } from '#types';

import { SceneHandler } from './handler.ts';

/** Scene builder for the canvas variant, a peer of `TldrawBuilder` and `SvgBuilder`. */
export const CanvasBuilder = IllustratorModel.makeBuilder({ schema: Canvas.SCENE_SCHEMA, handler: SceneHandler });
