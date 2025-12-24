//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { TranscriptionBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, TranscriptionBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, TranscriptionBlueprint.make()),
  ],
);

export default blueprintDefinition;
