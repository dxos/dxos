//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
