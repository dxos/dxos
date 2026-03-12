//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { ObservabilitySettingsSchema } from './ObservabilitySettings';
export type {
  ObservabilitySettingsProps,
  ObservabilitySettingsComponentProps,
} from './ObservabilitySettings';

export const HelpContainer: ComponentType<any> = lazy(() => import('./HelpContainer'));
export const ObservabilitySettings: ComponentType<any> = lazy(() => import('./ObservabilitySettings'));
