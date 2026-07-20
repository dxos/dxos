//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { InboxCapabilities } from '@dxos/plugin-inbox/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { BrainCapabilities } from '#types';

export * from './fact-store';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
// Provides AppCapabilities.NavigationPathResolver, not the navigationResolver maker's
// NavigationTargetResolver — kept as a plain module.
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  { provides: [AppCapabilities.NavigationPathResolver] },
  () => import('./navigation-resolver'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const FactStore = Capability.lazyModule(
  'FactStore',
  { provides: [BrainCapabilities.FactStoreRegistry, Capabilities.LayerSpec] },
  () => import('./fact-store'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [BrainCapabilities.Settings],
});
export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  { requires: [Capabilities.AtomRegistry], provides: [InboxCapabilities.MailboxAction] },
  () => import('./mailbox-action'),
);
