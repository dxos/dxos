//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.deckCompanion.streamDeck'],
});
