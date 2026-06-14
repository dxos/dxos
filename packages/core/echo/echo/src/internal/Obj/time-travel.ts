//
// Copyright 2025 DXOS.org
//

import { type AnyProperties } from '../common/types';
import { TimeTravelingId } from '../Entity';

/**
 * @returns `true` if the entity is currently in a historical (time-travel) read mode.
 */
export const isTimeTraveling = (entity: AnyProperties): boolean => {
  return (entity as any)[TimeTravelingId] === true;
};
