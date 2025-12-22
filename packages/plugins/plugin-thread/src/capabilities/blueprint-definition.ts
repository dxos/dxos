//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { ThreadBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, ThreadBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, ThreadBlueprint.make()),
  ],
);

export default blueprintDefinition;
