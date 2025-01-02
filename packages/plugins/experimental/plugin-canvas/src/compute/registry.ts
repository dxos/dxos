//
// Copyright 2025 DXOS.org
//

import {
  andShape,
  beaconShape,
  counterShape,
  functionShape,
  gptShape,
  listShape,
  notShape,
  orShape,
  switchShape,
  textShape,
  timerShape,
} from './shapes';
import type { ShapeDef } from '../components';

/**
 * Order used by toolbar.
 */
export const computeShapes: ShapeDef<any>[] = [
  functionShape,
  gptShape,
  textShape,
  switchShape,
  timerShape,
  andShape,
  orShape,
  notShape,
  listShape,
  beaconShape,
  counterShape,
];
