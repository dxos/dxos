//
// Copyright 2026 DXOS.org
//

import { type ComponentType, type LazyExoticComponent, lazy } from 'react';

import type { MessengerCompanionProps } from './MessengerCompanion/index.ts';

export const MessengerCompanion: LazyExoticComponent<ComponentType<MessengerCompanionProps>> = lazy(
  () => import('./MessengerCompanion/index.ts'),
);
