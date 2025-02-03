//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export { type MapContainerProps, type MapControlType } from './MapContainer';
export * from './MapControl';

export const MapContainer = lazy(() => import('./MapContainer'));
