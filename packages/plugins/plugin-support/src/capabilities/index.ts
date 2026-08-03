//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Operation from '@dxos/compute/Operation';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import * as HelpCapabilities from '../types/HelpCapabilities';
import * as SupportCapabilities from '../types/SupportCapabilities';
import * as SupportOperation from '../types/SupportOperation';
import type * as Tour from '../types/Tour';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [SupportCapabilities.Settings],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const HelpState = Capability.lazyModule(
  'HelpState',
  { provides: [HelpCapabilities.State] },
  () => import('./help-state'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'), {
  /** Maps the plugin's configured tour steps to the body's props. */
  props: (options: { helpSteps?: Tour.Step[] }) => options.helpSteps,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.plugin.space.role.homeContent',
    'org.dxos.plugin.support.role.hints',
    'org.dxos.plugin.support.role.keyshortcuts',
    'org.dxos.role.article',
    'org.dxos.role.deckCompanion.discord',
    'org.dxos.role.deckCompanion.help',
    'org.dxos.role.dialog',
    'org.dxos.role.section',
    'org.dxos.role.statusIndicator',
  ],
});
export const SupportSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SupportCapabilities.Settings],
});

// Genuine runtime event: fired imperatively by `plugin-space`'s create-space operation.
export const OnSpaceCreated = Capability.inlineModule(
  'on-space-created',
  { provides: [SpaceCapabilities.OnCreateSpace], activatesOn: SpaceEvents.SpaceCreated },
  () =>
    Effect.succeed([
      Capability.contribute(SpaceCapabilities.OnCreateSpace, (params) =>
        Operation.invoke(SupportOperation.OnCreateSpace, params),
      ),
    ]),
);
