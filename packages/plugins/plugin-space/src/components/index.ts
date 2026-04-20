//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './AwaitingObject';
export * from './CreateDialog';
export * from './ForeignKeys';
export * from './SyncStatus';

export const SpaceSettings: ComponentType<any> = lazy(() => import('./SpaceSettings'));
