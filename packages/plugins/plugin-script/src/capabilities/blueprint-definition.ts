//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';

import { ScriptBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability.Capability<typeof Common.Capability.Functions>
  | Capability.Capability<typeof Common.Capability.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Common.Capability.Functions, ScriptBlueprint.functions),
  Capability.contributes(Common.Capability.BlueprintDefinition, ScriptBlueprint.make()),
]);

export default blueprintDefinition;
