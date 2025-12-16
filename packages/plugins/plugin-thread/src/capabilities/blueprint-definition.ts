//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { ThreadBlueprint } from '../blueprints';

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, ThreadBlueprint.functions),
  contributes(Capabilities.BlueprintDefinition, ThreadBlueprint.make()),
];
