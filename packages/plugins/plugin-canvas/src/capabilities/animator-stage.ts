//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Type } from '@dxos/echo';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { defaultNodeRegistry, nodeAnimatable } from '@dxos/react-ui-canvas';

import { CanvasStage } from '#containers';
import { CANVAS_LAYOUTS, CANVAS_SCRIPT_PROPERTIES, canvasStageBinding, canvasStageTargets } from '#model';

// Keyed properties come from the built-in node schemas; a type only another plugin knows keys the shared ones.
const stage: AnimatorCapabilities.StageDef = {
  typename: Type.getTypename(Drawing.Canvas),
  label: 'Canvas',
  targets: (object) =>
    Drawing.isCanvas(object) ? canvasStageTargets(object, (node) => nodeAnimatable(defaultNodeRegistry, node)) : [],
  camera: { kind: '2d' },
  renderers: ['2d', 'overlay'],
  layouts: { ...CANVAS_LAYOUTS },
  scriptProperties: CANVAS_SCRIPT_PROPERTIES,
  bind: (object, sample) =>
    Drawing.isCanvas(object) ? canvasStageBinding(object, sample) : { objects: {}, links: [] },
  component: CanvasStage,
};

export default Capability.makeModule(() => Effect.succeed(Capability.contribute(AnimatorCapabilities.Stage, stage)));
