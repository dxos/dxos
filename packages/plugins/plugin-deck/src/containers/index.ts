//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DeckLayout: ComponentType<any> = lazy(() => import('./DeckLayout'));
export const DeckSettings: ComponentType<any> = lazy(() => import('./DeckSettings'));

export * from './DeckMain';
export * from './Plank';
export * from './Sidebar';
