//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Deck';
export * from './Sidebar';
// Eager: its only consumer is the deck's `ReactRoot` module body, which is itself fetched during
// the startup pass. A `lazy` boundary there moves the whole shell chunk to AFTER the boot loader
// dismisses, so the first frame is blank until it lands.
export { default as DeckLayout } from './DeckLayout';

export const DeckSettings: ComponentType<any> = lazy(() => import('./DeckSettings'));
