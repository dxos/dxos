//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapability } from '@dxos/plugin-space';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const Migrations = Capability.lazyModule(
  'IllustratorMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
