//
// Copyright 2025 DXOS.org
//

// Capabilities barrel with lazy-loaded modules.
// `AppCapability.*` makers pair a capability's requires/provides spec (evaluated before the
// module's code loads) with the deferred loader, enabling code-splitting; plugin-local
// capabilities that have no maker use `Capability.lazyModule()` directly.

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { SampleCapabilities, SampleEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: SampleEvents.Start,
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: SampleEvents.Start,
});

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.role.article',
    'org.dxos.role.deckCompanion.samplePanel',
    'org.dxos.role.objectProperties',
    'org.dxos.role.section',
    'org.dxos.role.statusIndicator',
  ],
});

export const SampleSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SampleCapabilities.Settings],
  activatesOn: SampleEvents.Start,
});
