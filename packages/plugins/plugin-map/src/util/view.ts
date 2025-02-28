//
// Copyright 2025 DXOS.org
//

import { type ViewType } from '@dxos/schema';

export const LocationColumn = 'location-column';

export const setLocationProperty = (view: ViewType, column: string) => {
  view.metadata = { ...(view.metadata || {}), [LocationColumn]: column };
};

export const getLocationProperty = (view?: ViewType): string | undefined => {
  return view?.metadata?.[LocationColumn];
};
