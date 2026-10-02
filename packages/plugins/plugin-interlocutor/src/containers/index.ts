//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const InterlocutorProperties: ComponentType<any> = lazy(() => import('./InterlocutorProperties/index.ts'));
export const ProfileProperties: ComponentType<any> = lazy(() => import('./ProfileProperties/index.ts'));
