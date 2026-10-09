//
// Copyright 2025 DXOS.org
//

import { type NodeDef, type NodeRegistry, defaultNodeRegistry } from '@dxos/react-ui-canvas/scene';

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
