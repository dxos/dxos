//
// Copyright 2025 DXOS.org
//

import { DEFAULT_GRID } from '@dxos/react-ui-canvas/scene';

// Kept out of `Box.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/**
 * The box's chrome, in whole grid cells rather than a pixel count of its own, so a shape sized from it
 * lands on the same lines the canvas draws and snaps to.
 */
export const headerHeight = 2 * DEFAULT_GRID;

export const footerHeight = 2 * DEFAULT_GRID;
