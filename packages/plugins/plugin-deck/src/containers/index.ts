//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Deck/index.ts';
export * from './Sidebar/index.ts';

export const DeckLayout: ComponentType<any> = lazy(() => import('./DeckLayout/index.ts'));
export const DeckSettings: ComponentType<any> = lazy(() => import('./DeckSettings/index.ts'));
