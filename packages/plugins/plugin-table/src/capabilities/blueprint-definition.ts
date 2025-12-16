//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { TableBlueprint } from '../blueprints';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, TableBlueprint.functions),
  contributes(Capabilities.BlueprintDefinition, TableBlueprint.make()),
];
