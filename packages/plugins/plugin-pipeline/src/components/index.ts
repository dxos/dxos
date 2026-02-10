//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export type { PipelineContainerProps } from './PipelineContainer';
export type { PipelineObjectSettingsProps } from './PipelineSettings';

export const PipelineContainer = lazy(() => import('./PipelineContainer'));
export const PipelineObjectSettings = lazy(() => import('./PipelineSettings'));
