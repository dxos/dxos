//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
