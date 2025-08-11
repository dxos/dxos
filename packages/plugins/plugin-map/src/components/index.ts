//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export { type MapContainerProps, type MapControlType } from './MapContainer';

export * from './Globe';
export * from './Map';
export * from './MapViewEditor';

export const MapContainer = lazy(() => import('./MapContainer'));
