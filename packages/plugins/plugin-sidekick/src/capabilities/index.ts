//
// Copyright 2025 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
