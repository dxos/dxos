//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { type MapContainerProps, type MapControlType } from './MapContainer/MapContainer';

export const MapContainer: ComponentType<any> = lazy(() => import('./MapContainer'));
export const MapViewEditor: ComponentType<any> = lazy(() => import('./MapViewEditor'));
