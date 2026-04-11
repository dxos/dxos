//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './AwaitingObject';
export * from './CreateDialog';
export * from './ObjectDetails';
export * from './ObjectForm';
export * from './SyncStatus';

export const SpacePluginSettings: ComponentType<any> = lazy(() => import('./SpacePluginSettings'));
