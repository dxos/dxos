//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FileArticle: ComponentType<any> = lazy(() => import('./FileArticle/index.ts'));
export const FileProperties: ComponentType<any> = lazy(() => import('./FileProperties/index.ts'));

export * from './FileSettings/index.ts';
