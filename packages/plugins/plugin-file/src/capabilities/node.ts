//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapability } from '@dxos/plugin-space';

import { FileCapabilities } from '#types';

// The capabilities `FilePlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing the React surfaces here would pull the plugin's
// components into every node and bun build.

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const EdgeBackend = Capability.lazyModule(
  'EdgeBackend',
  { requires: [ClientCapabilities.Client], provides: [FileCapabilities.Backend] },
  () => import('./edge-backend'),
);
export const InlineBackend = Capability.lazyModule(
  'InlineBackend',
  { provides: [FileCapabilities.Backend] },
  () => import('./inline-backend'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
