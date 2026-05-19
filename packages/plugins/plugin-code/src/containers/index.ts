//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CodeArticle: ComponentType<any> = lazy(() => import('./CodeArticle'));
export const CodeSettings: ComponentType<any> = lazy(() => import('./CodeSettings'));
export const SpecArticle: ComponentType<any> = lazy(() => import('./SpecArticle'));
export const SpecView: ComponentType<any> = lazy(() =>
  import('./SpecArticle').then((m) => ({ default: m.SpecView })),
);
