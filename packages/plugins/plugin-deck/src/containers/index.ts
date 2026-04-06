//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Deck';
export * from './Plank';
export * from './Sidebar';

export const DeckLayout: ComponentType<any> = lazy(() => import('./DeckLayout'));
