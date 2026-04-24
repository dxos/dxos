//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './FeedbackForm';

export const ObservabilitySettings: ComponentType<any> = lazy(() => import('./ObservabilitySettings'));
