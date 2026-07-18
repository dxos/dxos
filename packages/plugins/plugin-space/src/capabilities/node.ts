//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SpaceCapabilities } from '#types';

import { SpaceOperationConfig } from '../operations/helpers';

export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const IdentityCreated = Capability.lazyModule(
  'IdentityCreated',
  { requires: [ClientCapabilities.Client], provides: [SpaceCapabilities.PersonalSpace] },
  () => import('./identity-created'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  { provides: [Capabilities.UndoMapping, SpaceOperationConfig] },
  () => import('./undo-mappings'),
);
