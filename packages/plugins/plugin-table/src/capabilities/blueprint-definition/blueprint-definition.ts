//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';

import { TableBlueprint } from '../../blueprints';

type BlueprintCapabilities = (
  | Capability.Capability<typeof Common.Capability.Functions>
  | Capability.Capability<typeof Common.Capability.BlueprintDefinition>
)[];

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Common.Capability.Functions, TableBlueprint.functions),
  Capability.contributes(Common.Capability.BlueprintDefinition, TableBlueprint.make()),
]);

export default blueprintDefinition;
