//
// Copyright 2026 DXOS.org
//

import { type ComponentType, type LazyExoticComponent, lazy } from 'react';

import type { MessengerCompanionProps } from './MessengerCompanion/index.ts';
import type { MessengerSettingsProps } from './MessengerSettings/index.ts';

export const MessengerCompanion: LazyExoticComponent<ComponentType<MessengerCompanionProps>> = lazy(
  () => import('./MessengerCompanion/index.ts'),
);

export const MessengerSettings: LazyExoticComponent<ComponentType<MessengerSettingsProps>> = lazy(
  () => import('./MessengerSettings/index.ts'),
);
