//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { KanbanBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, KanbanBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, KanbanBlueprint.make()),
  ],
);

export default blueprintDefinition;
