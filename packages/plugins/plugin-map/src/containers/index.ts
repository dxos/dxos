//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { type MapArticleProps, type MapControlType } from './MapArticle';
export * from './MapSurface';

export const MapArticle: ComponentType<any> = lazy(() => import('./MapArticle'));
export const MapViewEditor: ComponentType<any> = lazy(() => import('./MapViewEditor'));
