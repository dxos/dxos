//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const StackArticle: ComponentType<any> = lazy(() => import('./StackArticle'));

export * from './StackSettings';
