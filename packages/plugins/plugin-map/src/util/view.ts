//
// Copyright 2025 DXOS.org
//

import { type ViewType } from '@dxos/schema';

export const LocationColumn = 'location-column';

/**
 * Sets the location property for a view.
 */
export const setLocationProperty = (view: ViewType, column: string) => {
  view.metadata = { ...(view.metadata || {}), [LocationColumn]: column };
};

/**
 * Gets the location property from a view.
 */
export const getLocationProperty = (view?: ViewType): string | undefined => {
  return view?.metadata?.[LocationColumn];
};
