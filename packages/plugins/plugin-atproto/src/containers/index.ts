//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AtprotoCompanion: ComponentType<any> = lazy(() => import('./AtprotoCompanion/index.ts'));
export const PdsBrowser: ComponentType<any> = lazy(() => import('./PdsBrowser/index.ts'));
