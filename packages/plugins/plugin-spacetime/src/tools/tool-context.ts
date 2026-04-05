//
// Copyright 2026 DXOS.org
//

import { type ArcRotateCamera, type Mesh, type Scene as BabylonScene } from '@babylonjs/core';

import { type Scene, type Model } from '../types';
import { type getManifold } from '../engine';

/** Shared context provided to all tools. */
export type ToolContext = {
  /** Babylon.js scene for visual manipulation. */
  scene: BabylonScene;
  /** Camera for controlling orbit during tool interactions. */
  camera: ArcRotateCamera;
  /** Canvas element for pointer coordinate mapping. */
  canvas: HTMLCanvasElement;
  /** Manifold WASM module for CSG operations. */
  manifold: Awaited<ReturnType<typeof getManifold>>;
  /** ECHO scene for committing changes after tool actions complete. */
  echoScene?: Scene.Scene;
  /** Map of ECHO object id to Babylon mesh. */
  meshes: Map<string, Mesh>;
  /** Resolve an ECHO object id to its Model.Object. */
  getObject: (id: string) => Model.Object | undefined;
};
