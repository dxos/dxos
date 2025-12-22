//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { ChessBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, ChessBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, ChessBlueprint.make()),
  ],
);

export default blueprintDefinition;
