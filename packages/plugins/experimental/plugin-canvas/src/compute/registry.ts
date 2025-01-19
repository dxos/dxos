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
  // functionShape,
  gptShape,
  listShape,
  ifElseShape,
  ifShape,
  jsonShape,
  notShape,
  orShape,
  // reduceShape,
  scopeShape,
  switchShape,
  // tableShape,
  textShape,
  threadShape,
  // timerShape,
  textToImageShape,
  viewShape,
  gptRealtimeShape,
} from './shapes';
import type { ShapeDef } from '../components';

/**
 * Order used by toolbar.
 */
export const computeShapes: { title: string; shapes: ShapeDef<any>[] }[] = [
  {
    title: 'Inputs',
    shapes: [
      //
      // timerShape,
      constantShape,
      textShape,
      chatShape,
      switchShape,
      audioShape,
    ],
  },
  {
    title: 'Transform',
    shapes: [
      //
      gptShape,
      gptRealtimeShape,
      // functionShape,
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
      // reduceShape,
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
      // tableShape,
      viewShape,
      counterShape,
      beaconShape,
      scopeShape,
    ],
  },
];
