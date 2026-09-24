//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { NODE_TYPE } from './NavTreeContainer/index.ts';

export const CommandsDialogContent: ComponentType<any> = lazy(() => import('./CommandsDialogContent/index.ts'));
export const CommandsTrigger: ComponentType<any> = lazy(() => import('./CommandsTrigger/index.ts'));
export const NavTreeContainer: ComponentType<any> = lazy(() => import('./NavTreeContainer/index.ts'));
export const NavTreeDocumentTitle: ComponentType<any> = lazy(() => import('./NavTreeDocumentTitle/index.ts'));
