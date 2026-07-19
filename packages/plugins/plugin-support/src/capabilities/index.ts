//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceCapability, SpaceEvents } from '@dxos/plugin-space';

import { HelpCapabilities, SupportCapabilities, SupportOperation, type Tour } from '#types';

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
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SupportSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SupportCapabilities.Settings],
});

// Genuine runtime event: fired imperatively by `plugin-space`'s create-space operation.
export const OnSpaceCreated = Capability.inlineModule(
  'on-space-created',
  { provides: [SpaceCapabilities.OnCreateSpace], activatesOn: SpaceEvents.SpaceCreated },
  () =>
    Effect.succeed([
      Capability.provide(SpaceCapabilities.OnCreateSpace, (params) =>
        Operation.invoke(SupportOperation.OnCreateSpace, params),
      ),
    ]),
);
