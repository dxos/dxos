//
// Copyright 2025 DXOS.org
//

import {
  andShape,
  appendShape,
  audioShape,
  beaconShape,
  chatShape,
  constantShape,
  counterShape,
  databaseShape,
  functionShape,
  gptRealtimeShape,
  gptShape,
  listShape,
  ifElseShape,
  ifShape,
  jsonShape,
  mapShape,
  notShape,
  orShape,
  reducerShape,
  scopeShape,
  switchShape,
  textShape,
  threadShape,
  textToImageShape,
  triggerShape,
  viewShape,
} from './shapes';
import type { ShapeDef } from '../components';
import { noteShape } from '../shapes';

/**
 * Order used by toolbar.
 */
export const computeShapes: { title: string; shapes: ShapeDef<any>[] }[] = [
  {
    title: 'Inputs',
    shapes: [
      //
      constantShape,
      textShape,
      chatShape,
      switchShape,
      audioShape,
      triggerShape,
    ],
  },
  {
    title: 'Transform',
    shapes: [
      //
      gptShape,
      gptRealtimeShape,
      functionShape,
      databaseShape,
      textToImageShape,
    ],
  },
  {
    title: 'Logic',
    shapes: [
      //
      ifShape,
      ifElseShape,
      andShape,
      orShape,
      notShape,
      reducerShape,
    ],
  },
  {
    title: 'Outputs',
    shapes: [
      //
      jsonShape,
      appendShape,
      listShape,
      threadShape,
      viewShape,
      counterShape,
      beaconShape,
      scopeShape,
      mapShape,
    ],
  },
  {
    title: 'Misc',
    shapes: [
      //
      noteShape,
    ],
  },
];
