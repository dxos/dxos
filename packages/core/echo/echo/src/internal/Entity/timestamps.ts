//
// Copyright 2026 DXOS.org
//

import { type AnyEntity } from '../common/types';

import { ObjectTimestampsId } from './model';

export interface EntityTimestamps {
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Returns the timestamps of an entity from the object meta index.
 * Returns undefined dates if the object has not been indexed yet.
 */
export const getTimestamps = (entity: AnyEntity): EntityTimestamps => {
  const ts = (entity as any)[ObjectTimestampsId];
  if (ts === undefined) {
    return {};
  }
  return ts;
};
