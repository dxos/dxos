//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Sketch';

export const SketchSettings: ComponentType<any> = lazy(() => import('./SketchSettings'));
