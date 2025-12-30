//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export { AssistantBlueprint } from './blueprint-definition';
