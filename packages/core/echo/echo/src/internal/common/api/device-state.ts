//
// Copyright 2026 DXOS.org
//

import { type EntityDeviceState, ObjectDeviceStateId } from '../types/index.ts';

/**
 * The device state of an entity that can hold values on this device only (a live ECHO object), or
 * `undefined` for any other value.
 */
export const getDeviceState = (target: unknown): EntityDeviceState | undefined => {
  if (typeof target !== 'object' || target === null || !(ObjectDeviceStateId in target)) {
    return undefined;
  }
  const state = target[ObjectDeviceStateId];
  return isEntityDeviceState(state) ? state : undefined;
};

const isEntityDeviceState = (value: unknown): value is EntityDeviceState =>
  typeof value === 'object' && value !== null && 'getAnnotations' in value && 'setAnnotation' in value;
