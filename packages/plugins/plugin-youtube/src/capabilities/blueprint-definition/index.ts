//
// Copyright 2024 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
