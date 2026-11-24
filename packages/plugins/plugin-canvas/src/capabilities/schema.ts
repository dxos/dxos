//
// Copyright 2026 DXOS.org
//

import * as Animation from '@dxos/plugin-animator/Animation';
import { Legacy, Scene, StyleCatalog } from '@dxos/scene';
import { CreatedFrom } from '@dxos/types';

import { Canvas, Generator } from '#types';

/**
 * The types this plugin registers: generators, which canvases place and agents write; its canvas; the scene objects
 * a canvas holds and the style catalogs its models share; the relation a migrated canvas records its legacy canvas by;
 * and the animation a migrated canvas timeline becomes.
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
  StyleCatalog,
  // The scene objects at the version before, so one a file or an older peer brings is read as what it is and migrated.
  ...Legacy.Types,
  CreatedFrom.CreatedFrom,
  Animation.Animation,
];
