//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', async () => import('./app-graph-builder'));
export const Client = Capability.lazy('Client', async () => import('./client'));
export const IntentResolver = Capability.lazy('IntentResolver', async () => import('./intent-resolver'));
export const Migrations = Capability.lazy('Migrations', async () => import('./migrations'));
export const ReactContext = Capability.lazy('ReactContext', async () => import('./react-context'));
export const ReactSurface = Capability.lazy('ReactSurface', async () => import('./react-surface'));
export const SchemaDefs = Capability.lazy('SchemaDefs', async () => import('./schema-defs'));
