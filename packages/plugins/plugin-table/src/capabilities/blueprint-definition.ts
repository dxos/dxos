//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { TableBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability.Capability<typeof Capabilities.Functions>
  | Capability.Capability<typeof Capabilities.BlueprintDefinition>
)[];

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Capabilities.Functions, TableBlueprint.functions),
  Capability.contributes(Capabilities.BlueprintDefinition, TableBlueprint.make()),
]);

export default blueprintDefinition;
