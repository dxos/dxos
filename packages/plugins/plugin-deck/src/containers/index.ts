//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DeckLayout: ComponentType<any> = lazy(() => import('./DeckLayout'));

export * from './DeckMain';
export * from './Plank';
export * from './Sidebar';
