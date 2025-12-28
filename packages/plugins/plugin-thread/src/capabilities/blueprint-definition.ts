//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { ThreadBlueprint } from '../blueprints';

type BlueprintCapabilities = (
  | Capability.Capability<typeof Capabilities.Functions>
  | Capability.Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    Capability.contributes(Capabilities.Functions, ThreadBlueprint.functions),
    Capability.contributes(Capabilities.BlueprintDefinition, ThreadBlueprint.make()),
  ],
);

export default blueprintDefinition;
