//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ExcalidrawArticle: ComponentType<any> = lazy(() => import('./ExcalidrawArticle/index.ts'));
export const ExcalidrawSettings: ComponentType<any> = lazy(() => import('./ExcalidrawSettings/index.ts'));
