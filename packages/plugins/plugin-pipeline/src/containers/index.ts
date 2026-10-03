//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PipelineArticle: ComponentType<any> = lazy(() => import('./PipelineArticle/index.ts'));
export const PipelineProperties: ComponentType<any> = lazy(() => import('./PipelineProperties/index.ts'));
