//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { ChessBlueprint } from '../blueprints';

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => {
  return [
    contributes(Capabilities.Functions, ChessBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, ChessBlueprint.make()),
  ];
};
