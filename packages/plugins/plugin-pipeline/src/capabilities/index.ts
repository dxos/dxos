//
// Copyright 2025 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
});
