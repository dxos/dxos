//
// Copyright 2026 DXOS.org
//

import { Scene } from '@dxos/scene';
import { CreatedFrom } from '@dxos/types';

import { Canvas, Generator } from '#types';

/**
 * The types this plugin registers: generators, which canvases place and agents write; its canvas; and the scene
 * objects a canvas holds, with the relation a migrated canvas records its legacy canvas by.
 */
export default [
  Generator.Generator,
  Canvas.Canvas,
  Scene.Model2D,
  Scene.Model3D,
  Scene.Layout2D,
  Scene.Layout3D,
  Scene.Scene2D,
  Scene.Scene3D,
  CreatedFrom.CreatedFrom,
];
