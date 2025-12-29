//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';

import { ChessBlueprint } from '../../blueprints';

type BlueprintCapabilities = (
  | Capability.Capability<typeof Common.Capability.Functions>
  | Capability.Capability<typeof Common.Capability.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Common.Capability.Functions, ChessBlueprint.functions),
  Capability.contributes(Common.Capability.BlueprintDefinition, ChessBlueprint.make()),
]);

export default blueprintDefinition;
