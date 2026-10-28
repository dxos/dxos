//
// Copyright 2026 DXOS.org
//

import { Obj, Type } from '@dxos/echo';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { Scene } from '#types';

import {
  DEFAULT_CAMERA,
  SPACETIME_LAYOUTS,
  defaultCamera,
  spacetimeStageBinding,
  spacetimeStageTargets,
} from '../../animator/index.ts';
import { SpacetimeStage } from './SpacetimeStage.tsx';

/** The spacetime scene as an animator stage (plugin-animator F-4.3): orbit camera, `3d` and `overlay` effects. */
export const spacetimeStage: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Scene.Scene),
  label: 'Spacetime',
  targets: (object) => (Obj.instanceOf(Scene.Scene, object) ? spacetimeStageTargets(object) : []),
  camera: {
    kind: 'orbit',
    values: (object) => ({ ...(Obj.instanceOf(Scene.Scene, object) ? defaultCamera(object) : DEFAULT_CAMERA) }),
  },
  renderers: ['3d', 'overlay'],
  layouts: { ...SPACETIME_LAYOUTS },
  bind: (object, sample) =>
    Obj.instanceOf(Scene.Scene, object) ? spacetimeStageBinding(object, sample) : { objects: {}, links: [] },
  component: SpacetimeStage,
};
