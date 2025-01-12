//
// Copyright 2025 DXOS.org
//

import {
  andShape,
  beaconShape,
  chatShape,
  counterShape,
  databaseShape,
  functionShape,
  gptShape,
  listShape,
  ifElseShape,
  ifShape,
  notShape,
  orShape,
  reduceShape,
  switchShape,
  tableShape,
  textShape,
  threadShape,
  timerShape,
  textToImageShape,
  viewShape,
} from './shapes';
import type { ShapeDef } from '../components';

/**
 * Order used by toolbar.
 */
export const computeShapes: ShapeDef<any>[] = [
  functionShape,
  gptShape,
  chatShape,
  textShape,
  databaseShape,
  textToImageShape,
  switchShape,
  timerShape,
  ifShape,
  ifElseShape,
  reduceShape,
  andShape,
  orShape,
  notShape,
  listShape,
  threadShape,
  tableShape,
  beaconShape,
  counterShape,
  viewShape,
];
