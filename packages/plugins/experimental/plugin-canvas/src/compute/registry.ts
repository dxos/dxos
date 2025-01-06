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
  notShape,
  orShape,
  switchShape,
  tableShape,
  textShape,
  threadShape,
  timerShape,
} from './shapes';
import type { ShapeDef } from '../components';
import { viewShape } from './shapes/View';

/**
 * Order used by toolbar.
 */
export const computeShapes: ShapeDef<any>[] = [
  functionShape,
  gptShape,
  chatShape,
  textShape,
  databaseShape,
  switchShape,
  timerShape,
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
