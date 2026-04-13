//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Call';
export * from './CommentsPanel';
export * from './MessagePanel';

export const ThreadSettings: ComponentType<any> = lazy(() => import('./ThreadSettings'));
