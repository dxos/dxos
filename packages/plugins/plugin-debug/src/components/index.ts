//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DebugSettings: ComponentType<any> = lazy(() => import('./DebugSettings'));

export * from './SchemaTable';
export * from './SpaceGenerator';
