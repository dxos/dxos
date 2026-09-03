//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { type MapArticleProps, type MapControlType } from './MapArticle/index.ts';
export * from './MapSurface/index.ts';

export const MapArticle: ComponentType<any> = lazy(() => import('./MapArticle/index.ts'));
export const MapViewEditor: ComponentType<any> = lazy(() => import('./MapViewEditor/index.ts'));
