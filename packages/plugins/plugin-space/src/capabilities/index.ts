//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const AppGraphSerializer = Capability.lazy('AppGraphSerializer', () => import('./app-graph-serializer'));
export const IdentityCreated = Capability.lazy('IdentityCreated', () => import('./identity-created'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Repair = Capability.lazy('Repair', () => import('./repair'));
export const SpaceSettings = Capability.lazy('SpaceSettings', () => import('./settings'));
export const SpaceState = Capability.lazy('SpaceState', () => import('./state'));
export const SpacesReady = Capability.lazy('SpacesReady', () => import('./spaces-ready'));
