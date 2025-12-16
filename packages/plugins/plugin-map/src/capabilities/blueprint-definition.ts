//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { MapBlueprint } from '../blueprints';

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, MapBlueprint.functions),
  contributes(Capabilities.BlueprintDefinition, MapBlueprint.make()),
];
