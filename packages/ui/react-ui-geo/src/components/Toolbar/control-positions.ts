//
// Copyright 2025 DXOS.org
//

import { type ControlPosition } from 'leaflet';

// Kept out of `Controls.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const controlPositions: Record<ControlPosition, string> = {
  topleft: 'top-2 left-2',
  topright: 'top-2 right-2',
  bottomleft: 'bottom-2 left-2',
  bottomright: 'bottom-2 right-2',
};
