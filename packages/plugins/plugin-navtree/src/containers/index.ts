//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { NODE_TYPE } from './NavTreeContainer/NavTreeContainer';

export const CommandsDialogContent: ComponentType<any> = lazy(() => import('./CommandsDialogContent'));
export const CommandsTrigger: ComponentType<any> = lazy(() => import('./CommandsTrigger'));
export const NavTreeContainer: ComponentType<any> = lazy(() => import('./NavTreeContainer'));
export const NavTreeDocumentTitle: ComponentType<any> = lazy(() => import('./NavTreeDocumentTitle'));
