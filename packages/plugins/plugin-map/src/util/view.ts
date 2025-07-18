//
// Copyright 2025 DXOS.org
//

import { type DataType } from '@dxos/schema';

export const LocationColumn = 'location-column';

/**
 * Sets the location property for a view.
 */
export const setLocationProperty = (projection: DataType.Projection, column: string) => {
  projection.metadata = { ...(projection.metadata || {}), [LocationColumn]: column };
};

/**
 * Gets the location property from a view.
 */
export const getLocationProperty = (projection?: DataType.Projection): string | undefined => {
  return projection?.metadata?.[LocationColumn];
};
