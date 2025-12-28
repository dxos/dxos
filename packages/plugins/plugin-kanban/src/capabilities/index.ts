//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
