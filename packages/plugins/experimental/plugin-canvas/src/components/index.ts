//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './defs';

export * from './Canvas';
export * from './Editor';
export * from './TextBox';
export * from './Toolbar';
export * from './UI';

export const CanvasContainer = lazy(() => import('./CanvasContainer'));
