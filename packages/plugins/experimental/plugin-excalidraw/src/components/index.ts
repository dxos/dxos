//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './SketchSettings';

export const SketchComponent = lazy(() => import('./SketchComponent'));
export const SketchMain = lazy(() => import('./SketchMain'));
