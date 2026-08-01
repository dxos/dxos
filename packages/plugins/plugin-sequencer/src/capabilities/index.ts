//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { SpaceCapability } from '@dxos/plugin-space';

import { SequencerEvents } from '#types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: SequencerEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
