//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import * as FileCapabilities from '../types/FileCapabilities';
import * as FileEvents from '../types/FileEvents';

// The capabilities `FilePlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing the React surfaces here would pull the plugin's
// components into every node and bun build.

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const EdgeBackend = Capability.lazyModule(
  'EdgeBackend',
  {
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    activatesOn: FileEvents.Start,
  },
  () => import('./edge-backend'),
);
export const InlineBackend = Capability.lazyModule(
  'InlineBackend',
  { provides: [FileCapabilities.Backend], activatesOn: FileEvents.Start },
  () => import('./inline-backend'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
