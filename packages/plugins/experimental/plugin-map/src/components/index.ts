//
// Copyright 2023 DXOS.org
//

import React from 'react';

export { type MapContainerProps, type MapControlType } from './MapContainer';

// Lazily load components for content surfaces.
export const MapContainer = React.lazy(() => import('./MapContainer'));
