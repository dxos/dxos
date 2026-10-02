//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { lazyWithPreload } from '@dxos/react-ui';

export { NODE_TYPE } from './NavTreeContainer/index.ts';

// Preloadable: the palette must open on the first keystroke rather than after a chunk fetch.
export const CommandsDialogContent = lazyWithPreload(() => import('./CommandsDialogContent/index.ts'));
export const CommandsTrigger: ComponentType<any> = lazy(() => import('./CommandsTrigger/index.ts'));
export const NavTreeContainer: ComponentType<any> = lazy(() => import('./NavTreeContainer/index.ts'));
export const NavTreeDocumentTitle: ComponentType<any> = lazy(() => import('./NavTreeDocumentTitle/index.ts'));
