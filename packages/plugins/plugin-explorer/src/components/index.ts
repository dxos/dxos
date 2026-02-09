//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Chart';
export * from './Globe';
export * from './Graph';
export * from './Tree';

export const ExplorerContainer: ComponentType<any> = lazy(() => import('./ExplorerContainer'));
