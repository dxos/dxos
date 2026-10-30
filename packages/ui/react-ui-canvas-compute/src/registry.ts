//
// Copyright 2025 DXOS.org
//

import { type NodeDef, type NodeRegistry, defaultNodeRegistry } from '@dxos/react-ui-canvas/scene';
import { KindRegistry } from '@dxos/scene';

import {
  andNodeDef,
  appendNodeDef,
  audioNodeDef,
  beaconNodeDef,
  chatNodeDef,
  constantNodeDef,
  databaseNodeDef,
  feedNodeDef,
  functionNodeDef,
  gptNodeDef,
  gptRealtimeNodeDef,
  ifElseNodeDef,
  ifNodeDef,
  jsonNodeDef,
  jsonTransformNodeDef,
  notNodeDef,
  orNodeDef,
  randomNodeDef,
  reducerNodeDef,
  scopeNodeDef,
  surfaceNodeDef,
  switchNodeDef,
  templateNodeDef,
  textNodeDef,
  textToImageNodeDef,
  threadNodeDef,
  triggerNodeDef,
} from './shapes/index.ts';

/** The compute types in palette order, each under its group (Inputs, Transform, Operations, Outputs). */
export const computeNodeDefs: NodeDef[] = [
  constantNodeDef,
  templateNodeDef,
  chatNodeDef,
  switchNodeDef,
  audioNodeDef,
  triggerNodeDef,
  randomNodeDef,
  gptNodeDef,
  gptRealtimeNodeDef,
  functionNodeDef,
  databaseNodeDef,
  textToImageNodeDef,
  appendNodeDef,
  ifNodeDef,
  ifElseNodeDef,
  andNodeDef,
  orNodeDef,
  notNodeDef,
  reducerNodeDef,
  jsonTransformNodeDef,
  jsonNodeDef,
  feedNodeDef,
  threadNodeDef,
  textNodeDef,
  surfaceNodeDef,
  beaconNodeDef,
  scopeNodeDef,
];

/** The compute types plus the engine's note under a `Misc` group. */
export const computeNodeRegistry: NodeRegistry = {
  ...Object.fromEntries(computeNodeDefs.map((def) => [def.type, def])),
  note: { ...defaultNodeRegistry.note, group: 'Misc' },
};

/**
 * The compute element kinds (COMMON-CORE.md decision 13): a board's element of a compute type is checked against its
 * shape's schema, which reads the kind's own fields (its compute `node`, a value) at the top of the element.
 */
export const computeKinds: KindRegistry = Object.values(computeNodeRegistry).reduce(
  (kinds, def) => kinds.register(def.type, def.schema),
  new KindRegistry(),
);
