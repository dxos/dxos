//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { ScriptBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability.Capability<typeof Capabilities.Functions>
  | Capability.Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Capabilities.Functions, ScriptBlueprint.functions),
  Capability.contributes(Capabilities.BlueprintDefinition, ScriptBlueprint.make()),
]);

export default blueprintDefinition;
