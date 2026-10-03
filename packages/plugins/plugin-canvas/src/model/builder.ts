//
// Copyright 2026 DXOS.org
//

import { makeBuilder } from '@dxos/plugin-illustrator/model';

import { Canvas } from '#types';

import { SceneHandler } from './handler.ts';

/** Scene builder for the canvas variant, a peer of `TldrawBuilder` and `SvgBuilder`. */
export const CanvasBuilder = makeBuilder({ schema: Canvas.SCENE_SCHEMA, handler: SceneHandler });
