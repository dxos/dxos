//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import { type LayerSpec, type OperationHandlerSet, type Skill } from '@dxos/compute';
import { InboxCapabilities } from '@dxos/plugin-inbox/types';

import { BrainCapabilities } from '#types';

export * from './fact-store';

export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
export const FactStore = Capability.lazyModule(
  'FactStore',
  { provides: [BrainCapabilities.FactStoreRegistry, Capabilities.LayerSpec] },
  () => import('./fact-store'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const Settings = Capability.lazyModule(
  'Settings',
  { provides: [BrainCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  { requires: [Capabilities.AtomRegistry], provides: [InboxCapabilities.MailboxAction] },
  () => import('./mailbox-action'),
);
