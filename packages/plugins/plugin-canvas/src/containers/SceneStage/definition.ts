//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import { LAYOUTS_3D, Scene } from '@dxos/scene';

import { camera2DValues, camera3DValues, sceneBinding, sceneTargets } from '../../model/scene-stage.ts';
import { SceneStage } from './SceneStage.tsx';
import { sceneDocumentOf } from './use-scene-document.ts';

const EMPTY_BINDING: AnimatorCapabilities.StageBinding = { objects: {}, links: [] };

/** A 2D scene as an animator stage: scripts write `center` and `size`, and `2d` and overlay effects draw over it. */
export const scene2dStage: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Scene.Scene2D),
  label: 'Scene (2D)',
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
  scriptProperties: { position: 'center', scale: 'size', opacity: 'style.opacity' },
  bind: (object, sample) => {
    const document = sceneDocumentOf(object);
    return document ? sceneBinding(document, sample) : EMPTY_BINDING;
  },
  component: SceneStage,
};

/** A 3D scene as an animator stage: an orbit camera, the 3D layouts, and `3d` and overlay effects. */
export const scene3dStage: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Scene.Scene3D),
  label: 'Scene (3D)',
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
  layouts: { ...LAYOUTS_3D },
  scriptProperties: { position: 'center', opacity: 'style.opacity' },
  bind: (object, sample) => {
    const document = sceneDocumentOf(object);
    return document ? sceneBinding(document, sample) : EMPTY_BINDING;
  },
  component: SceneStage,
};
