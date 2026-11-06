//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import { ARRANGERS_3D, Scene } from '@dxos/scene';

import { camera2DValues, camera3DValues, sceneBinding, sceneTargets } from '../../model/scene-stage.ts';
import { CANVAS_LAYOUTS } from '../../model/stage.ts';
import { CanvasStage } from './CanvasStage.tsx';
import { sceneDocumentOf } from './use-scene-document.ts';

const EMPTY_BINDING: AnimatorCapabilities.StageBinding = { objects: {}, links: [] };

/**
 * A 2D canvas scene as an animator stage: scripts write `center` and `size` and may place targets in a row or ring, and
 * `2d` and overlay effects draw over it.
 */
export const canvasStage2D: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Scene.Scene2D),
  label: 'Canvas',
  targets: (object) => {
    const document = sceneDocumentOf(object);
    return document ? sceneTargets(document) : [];
  },
  camera: {
    kind: '2d',
    values: (object) => {
      const root = sceneDocumentOf(object)?.scenes[0];
      return root?.dim === '2d' ? camera2DValues(root.camera) : {};
    },
  },
  renderers: ['2d', 'overlay'],
  layouts: { ...CANVAS_LAYOUTS },
  scriptProperties: { position: 'center', scale: 'size', opacity: 'overrides.opacity' },
  bind: (object, sample) => {
    const document = sceneDocumentOf(object);
    return document ? sceneBinding(document, sample) : EMPTY_BINDING;
  },
  component: CanvasStage,
};

/** A 3D canvas scene as an animator stage: an orbit camera, the 3D layouts, and `3d` and overlay effects. */
export const canvasStage3D: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Scene.Scene3D),
  label: '3D Canvas',
  targets: (object) => {
    const document = sceneDocumentOf(object);
    return document ? sceneTargets(document) : [];
  },
  camera: {
    kind: 'orbit',
    values: (object) => {
      const root = sceneDocumentOf(object)?.scenes[0];
      return root?.dim === '3d' ? camera3DValues(root.camera) : {};
    },
  },
  renderers: ['3d', 'overlay'],
  layouts: { ...ARRANGERS_3D },
  scriptProperties: { position: 'center', opacity: 'overrides.opacity' },
  bind: (object, sample) => {
    const document = sceneDocumentOf(object);
    return document ? sceneBinding(document, sample) : EMPTY_BINDING;
  },
  component: CanvasStage,
};
