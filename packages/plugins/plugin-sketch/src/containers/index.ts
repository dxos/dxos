//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const SketchContainer: ComponentType<any> = lazy(() => import('./SketchContainer'));
export const SketchSettings: ComponentType<any> = lazy(() => import('./SketchSettings'));
