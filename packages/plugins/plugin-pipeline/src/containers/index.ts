//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PipelineContainer: ComponentType<any> = lazy(() => import('./PipelineContainer'));
export const PipelineObjectSettings: ComponentType<any> = lazy(() => import('./PipelineObjectSettings'));
