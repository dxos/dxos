//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { TranscriptionBlueprint } from '../blueprints';

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, TranscriptionBlueprint.functions),
  contributes(Capabilities.BlueprintDefinition, TranscriptionBlueprint.make()),
];
