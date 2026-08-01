//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapability } from '@dxos/plugin-space';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'IllustratorMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
