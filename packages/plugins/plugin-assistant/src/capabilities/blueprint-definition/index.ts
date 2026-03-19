//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/operation';

export { type OperationHandlerSet };

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
