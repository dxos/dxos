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
  ifElseShape,
  ifShape,
  jsonShape,
  jsonTransformShape,
  notShape,
  orShape,
  queueShape,
  randomShape,
  reducerShape,
  scopeShape,
  surfaceShape,
  switchShape,
  templateShape,
  threadShape,
  textToImageShape,
  triggerShape,
  textShape,
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
      templateShape,
      chatShape,
      switchShape,
      audioShape,
      triggerShape,
      randomShape,
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
      appendShape,
    ],
  },
  {
    title: 'Operations',
    shapes: [
      //
      ifShape,
      ifElseShape,
      andShape,
      orShape,
      notShape,
      reducerShape,
      jsonTransformShape,
    ],
  },
  {
    title: 'Outputs',
    shapes: [
      //
      jsonShape,
      queueShape,
      threadShape,
      textShape,
      surfaceShape,
      counterShape,
      beaconShape,
      scopeShape,
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
