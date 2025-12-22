//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { TableBlueprint } from '../blueprints';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, TableBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, TableBlueprint.make()),
  ],
);

export default blueprintDefinition;
